import { randomUUID } from "node:crypto";

export interface DashboardResponse { course: string; availability: string; submittedAt: string }
interface StoreConfig { url: string; token: string; prefix: string }
export class ResponseStoreError extends Error {
  status: number;
  constructor(message = "Não foi possível acessar as respostas do dashboard. Tente novamente em instantes.", status = 503) { super(message); this.name = "ResponseStoreError"; this.status = status; }
}

export function getResponseStoreConfig(env: NodeJS.ProcessEnv = process.env): StoreConfig | null {
  // The Vercel Marketplace installs the KV pair; direct Upstash connections
  // use the Upstash pair. Keep the URL and token from the same connection.
  const directUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  const directToken = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const url = directUrl && directToken ? directUrl : env.KV_REST_API_URL?.trim();
  const token = directUrl && directToken ? directToken : env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/") return null;
    return { url: endpoint.origin, token, prefix: "laia:member-form:v1" };
  } catch { return null; }
}

function id(value: string) {
  const normalized = value.replaceAll("-", "").toLowerCase();
  if (!/^[a-f\d]{32}$/.test(normalized)) throw new ResponseStoreError("Cadastro inválido.", 400);
  return normalized;
}
function response(value: unknown): DashboardResponse | null {
  if (value === null) return null;
  try {
    const row = JSON.parse(String(value)) as Partial<DashboardResponse>;
    if (typeof row.course !== "string" || !row.course.trim() || row.course.length > 120 || typeof row.availability !== "string" || row.availability.length > 100 || typeof row.submittedAt !== "string" || !Number.isFinite(Date.parse(row.submittedAt))) throw new Error();
    return { course: row.course, availability: row.availability, submittedAt: row.submittedAt };
  } catch { throw new ResponseStoreError("Uma resposta do dashboard precisa ser conferida pela diretoria."); }
}

// Durable server-side storage. Never fall back to local files or browser storage.
export function createResponseStore(config: StoreConfig, sourceId: string, fetcher: typeof fetch = fetch) {
  const prefix = `${config.prefix}:${id(sourceId)}:`;
  const key = (memberId: string) => `${prefix}${id(memberId)}`;
  async function command<T>(args: Array<string | number>): Promise<T> {
    try {
      const result = await fetcher(config.url, { method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" }, body: JSON.stringify(args), cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!result.ok) throw new ResponseStoreError();
      const data = await result.json() as { result?: T; error?: string };
      if (data.error || !("result" in data)) throw new ResponseStoreError();
      return data.result as T;
    } catch (error) { throw error instanceof ResponseStoreError ? error : new ResponseStoreError(); }
  }
  return {
    async readMany(memberIds: string[]) {
      const entries = new Map<string, DashboardResponse>();
      // Batch reads keep dashboard refreshes to one request per 100 members.
      for (let start = 0; start < memberIds.length; start += 100) {
        const batch = memberIds.slice(start, start + 100);
        const values = await command<Array<string | null>>(["MGET", ...batch.map(key)]);
        if (!Array.isArray(values) || values.length !== batch.length) throw new ResponseStoreError();
        values.forEach((value, index) => { const parsed = response(value); if (parsed) entries.set(id(batch[index]), parsed); });
      }
      return entries;
    },
    async readForForm(memberId: string) {
      const values = await command<Array<string | null>>(["MGET", key(memberId), `${key(memberId)}:draft`]);
      return response(values[1] ?? values[0]);
    },
    async begin(memberId: string, answer: DashboardResponse) {
      const base = key(memberId);
      const owner = randomUUID();
      const locked = await command<string | null>(["SET", `${base}:lock`, owner, "NX", "EX", 120]);
      if (locked !== "OK") throw new ResponseStoreError("Já existe um envio em andamento. Aguarde alguns instantes antes de tentar novamente.", 409);
      let released = false;
      const release = async () => {
        if (released) return;
        await command(["EVAL", "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, `${base}:lock`, owner]);
        released = true;
      };
      try {
        const written = await command<string>(["SET", `${base}:draft`, JSON.stringify(answer), "EX", 86400]);
        if (written !== "OK") throw new ResponseStoreError();
      } catch (error) { await release().catch(() => {}); throw error; }
      return {
        release,
        async commit() {
          const result = await command<number>(["EVAL", "if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end; redis.call('SET',KEYS[2],ARGV[2]); redis.call('DEL',KEYS[3]); redis.call('DEL',KEYS[1]); return 1", 3, `${base}:lock`, base, `${base}:draft`, owner, JSON.stringify(answer)]);
          if (result !== 1) throw new ResponseStoreError();
          released = true;
        },
      };
    },
  };
}
