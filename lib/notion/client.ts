import type { NotionRow } from "./transform";

interface NotionProperty {
  id: string;
  type: string;
  has_more?: boolean;
  [key: string]: unknown;
}

interface NotionPage {
  id: string;
  url: string;
  archived?: boolean;
  in_trash?: boolean;
  properties: Record<string, NotionProperty>;
}

interface ApiList<T> {
  results: T[];
  has_more: boolean;
  next_cursor: string | null;
}

function plainText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map(item => item.plain_text ?? item.text?.content ?? "").join("");
}

function propertyValue(property: NotionProperty): unknown {
  const value = property[property.type];
  switch (property.type) {
    case "title":
    case "rich_text": return plainText(value);
    case "select":
    case "status": return (value as { name?: string } | null)?.name ?? null;
    case "multi_select": return (value as Array<{ name: string }>).map(option => option.name);
    case "relation": return (value as Array<{ id: string }>).map(item => item.id);
    case "number":
    case "checkbox":
    case "url": return value;
    default: return undefined;
  }
}

export function pageToRow(page: NotionPage): NotionRow {
  const row: NotionRow = { url: page.url, archived: page.archived, in_trash: page.in_trash };
  for (const [name, property] of Object.entries(page.properties)) {
    if (property.type === "date") {
      row[`date:${name}:start`] = (property.date as { start?: string } | null)?.start ?? null;
    } else {
      const value = propertyValue(property);
      if (value !== undefined) row[name] = value;
    }
  }
  return row;
}

export async function fetchNotionRows(
  config: { token: string; members: string; projects: string },
  fetcher: typeof fetch = fetch,
) {
  if (!config.token) throw new Error("Defina NOTION_TOKEN em .env.local para conectar o dashboard ao Notion.");
  for (const id of [config.members, config.projects]) {
    if (!/^[a-f\d-]{32,36}$/i.test(id)) throw new Error("Identificador de base do Notion inválido.");
  }

  async function request<T>(endpoint: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetcher(`https://api.notion.com/v1/${endpoint}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Notion-Version": "2025-09-03", "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 429 && attempt < 2) {
        const seconds = Math.min(Math.max(Number(response.headers.get("retry-after")) || 1, 1), 5);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        continue;
      }
      if (!response.ok) {
        if (response.status === 401) throw new Error("O token do Notion não é válido. Confira NOTION_TOKEN em .env.local.");
        if (response.status === 403 || response.status === 404) throw new Error("O Notion não liberou acesso às bases. Adicione a integração às páginas Membros e Projetos.");
        throw new Error(`Não foi possível consultar o Notion (HTTP ${response.status}).`);
      }
      return await response.json() as T;
    }
    throw new Error("O Notion atingiu o limite de consultas. Tente novamente em instantes.");
  }

  async function query(id: string) {
    const rows: NotionRow[] = [];
    let cursor: string | null = null;
    const seen = new Set<string>();
    do {
      const page: ApiList<NotionPage> = await request(`data_sources/${id}/query`, {
        page_size: 100, ...(cursor ? { start_cursor: cursor } : {}),
      });
      if (!Array.isArray(page.results)) throw new Error("Resposta inválida do Notion.");
      for (const entry of page.results) {
        // Relations in a page response are capped at 25 entries by Notion.
        for (const [name, property] of Object.entries(entry.properties)) {
          if (!["Time", "Responsável"].includes(name) || property.type !== "relation" || !property.has_more) continue;
          const relations: Array<{ id: string }> = [];
          let propertyCursor: string | null = null;
          const propertyCursors = new Set<string>();
          do {
            const suffix = propertyCursor ? `&start_cursor=${encodeURIComponent(propertyCursor)}` : "";
            const list: ApiList<{ relation: { id: string } }> = await request(`pages/${entry.id}/properties/${encodeURIComponent(property.id)}?page_size=100${suffix}`);
            relations.push(...list.results.map(item => item.relation));
            propertyCursor = list.has_more ? list.next_cursor : null;
            if (list.has_more && (!propertyCursor || propertyCursors.has(propertyCursor))) throw new Error("Paginação de relações inválida no Notion.");
            if (propertyCursor) propertyCursors.add(propertyCursor);
          } while (propertyCursor);
          property.relation = relations;
          property.has_more = false;
        }
        if (!entry.archived && !entry.in_trash) rows.push(pageToRow(entry));
      }
      cursor = page.has_more ? page.next_cursor : null;
      if (page.has_more && (!cursor || seen.has(cursor))) throw new Error("Paginação inválida no Notion.");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return rows;
  }
  const [members, projects] = await Promise.all([query(config.members), query(config.projects)]);
  return { members, projects };
}
