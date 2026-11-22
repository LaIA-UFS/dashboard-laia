import { createHash } from "node:crypto";
import type { ProfileAnswer, PublicMemberProfile } from "./profile";

type Property = { type: string; [key: string]: unknown };
interface NotionPage {
  id: string;
  parent: { data_source_id?: string; database_id?: string };
  archived?: boolean;
  in_trash?: boolean;
  properties: Record<string, Property>;
}
interface NotionSchema { properties: Record<string, Property> }
export interface ProfileNotionConfig { token: string; members: string }
export class ProfileNotionError extends Error {
  status: number;
  constructor(message: string, status = 500) { super(message); this.name = "ProfileNotionError"; this.status = status; }
}
const UUID = /^[a-f\d]{8}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{12}$/i;
const normalizeId = (value: string) => value.replaceAll("-", "").toLowerCase();
function text(property?: Property) {
  const content = property?.[property.type];
  return Array.isArray(content) ? content.map(item => item.plain_text ?? item.text?.content ?? "").join("") : typeof content === "string" ? content : "";
}
function multi(property?: Property): string[] {
  return Array.isArray(property?.multi_select) ? property.multi_select.map(item => String(item.name)) : [];
}
function options(property?: Property): string[] {
  const settings = property?.multi_select as { options?: Array<{ name: string }> } | undefined;
  return settings?.options?.map(option => option.name) ?? [];
}

async function request<T>(config: ProfileNotionConfig, endpoint: string, fetcher: typeof fetch, body?: unknown): Promise<T> {
  if (!config.token) throw new ProfileNotionError("O recebimento de respostas ainda não foi ativado.", 503);
  const response = await fetcher(`https://api.notion.com/v1/${endpoint}`, {
    method: body === undefined ? "GET" : "PATCH",
    headers: { Authorization: `Bearer ${config.token}`, "Notion-Version": "2025-09-03", "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (response.status === 429) throw new ProfileNotionError("Há muitos envios neste momento. Aguarde um minuto e tente novamente.", 429);
    if ([401, 403].includes(response.status)) throw new ProfileNotionError("A conexão com o Notion precisa ser conferida pela diretoria.", 503);
    if (response.status === 404) throw new ProfileNotionError("Este cadastro não está disponível. Solicite outro link à diretoria.", 404);
    throw new ProfileNotionError("Não foi possível salvar no Notion agora. Suas respostas continuam no formulário; tente novamente.", 502);
  }
  return response.json() as Promise<T>;
}

async function readPage(config: ProfileNotionConfig, memberId: string, fetcher: typeof fetch) {
  if (!UUID.test(memberId) || !UUID.test(config.members)) throw new ProfileNotionError("Link de cadastro inválido.", 404);
  const page = await request<NotionPage>(config, `pages/${memberId}`, fetcher);
  if (page.archived || page.in_trash || normalizeId(page.parent?.data_source_id ?? "") !== normalizeId(config.members)) throw new ProfileNotionError("Este link não corresponde a um cadastro disponível da LaIA.", 404);
  return page;
}

export async function loadMemberProfile(config: ProfileNotionConfig, memberId: string, fetcher: typeof fetch = fetch) {
  // Validate the page's parent before exposing any of its fields.
  const page = await readPage(config, memberId, fetcher);
  const schema = await request<NotionSchema>(config, `data_sources/${config.members}`, fetcher);
  const expected = { Name: "title", Email: "email", Phone: "phone_number", Techs: "multi_select", "Áreas de interesse": "multi_select" };
  for (const [name, type] of Object.entries(expected)) {
    if (schema.properties[name]?.type !== type) throw new ProfileNotionError("Os campos do cadastro precisam ser conferidos pela diretoria.", 503);
  }
  const editable = {
    name: text(page.properties.Name), email: text(page.properties.Email), phone: text(page.properties.Phone),
    techs: multi(page.properties.Techs), interests: multi(page.properties["Áreas de interesse"]),
  };
  const revision = createHash("sha256").update(JSON.stringify({ ...editable, techs: [...editable.techs].sort(), interests: [...editable.interests].sort() })).digest("hex");
  const profile: PublicMemberProfile = { ...editable, revision, techOptions: options(schema.properties.Techs), interestOptions: options(schema.properties["Áreas de interesse"]) };
  return { profile, schema };
}

export async function saveMemberProfile(config: ProfileNotionConfig, memberId: string, answer: ProfileAnswer, fetcher: typeof fetch = fetch) {
  const { profile, schema } = await loadMemberProfile(config, memberId, fetcher);
  if (answer.revision !== profile.revision) throw new ProfileNotionError("O cadastro mudou desde que você abriu o formulário. Recarregue a página para conferir os dados antes de enviar.", 409);
  if (answer.techs.some(value => !profile.techOptions.includes(value)) || answer.interests.some(value => !profile.interestOptions.includes(value))) throw new ProfileNotionError("As opções disponíveis mudaram. Recarregue o formulário para conferir.", 409);
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: answer.name } }] },
    Email: { email: answer.email }, Phone: { phone_number: answer.phone },
    Techs: { multi_select: answer.techs.map(name => ({ name })) },
    "Áreas de interesse": { multi_select: answer.interests.map(name => ({ name })) },
  };
  const registration = schema.properties.Cadastro;
  const choices = registration?.select as { options?: Array<{ name: string }> } | undefined;
  if (registration?.type === "select" && choices?.options?.some(option => option.name === "atualizado")) properties.Cadastro = { select: { name: "atualizado" } };
  // This updates one existing page. No schema, role, team, project, or page-content writes.
  await request(config, `pages/${memberId}`, fetcher, { properties });
}
