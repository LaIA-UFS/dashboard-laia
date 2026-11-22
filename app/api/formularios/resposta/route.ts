import { z } from "zod";
import { revalidateTag } from "next/cache";
import { createSubmissionLimiter, readMemberInvite } from "@/lib/forms/member-invite";
import { profileAnswerSchema, progressSchema } from "@/lib/forms/profile";
import { communicationNames, technologyNames } from "@/lib/forms/skill-catalog";
import { loadMemberProfile, ProfileNotionError, saveMemberProfile } from "@/lib/forms/notion-profile";
import { getNotionConfig } from "@/lib/notion/config";
import { createResponseStore, getResponseStoreConfig, ResponseStoreError } from "@/lib/forms/response-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limiter = createSubmissionLimiter();
const common = { token: z.string().min(1).max(4096), website: z.string().max(0).optional() };
const submissionEnvelope = z.object({ ...common, answer: profileAnswerSchema }).strict();
const progressEnvelope = z.object({ ...common, progress: progressSchema }).strict();
const json = (value: unknown, status: number) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });

async function limitedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ProfileNotionError("Envio vazio.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new ProfileNotionError("O formulário excedeu o tamanho permitido.", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ProfileNotionError("Envio inválido. Confira as informações.", 400); }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return json({ success: false, message: "Reabra o link do formulário antes de enviar." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ success: false, message: "Formato de envio inválido." }, 415);
  try {
    const body = await limitedJson(request);
    const parsed = ("progress" in (typeof body === "object" && body !== null ? body : {})
      ? progressEnvelope : submissionEnvelope).safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const [root, fieldName] = issue.path;
        const field = String((root === "answer" || root === "progress" ? fieldName : root) ?? "form");
        (fieldErrors[field] ??= []).push(issue.message);
      }
      return json({ success: false, message: "Confira os campos indicados antes de enviar.", fieldErrors }, 400);
    }
    const config = getNotionConfig();
    const invite = await readMemberInvite(parsed.data.token, config.members);
    if (!invite) return json({ success: false, message: "O link é inválido ou expirou. Solicite um novo link à diretoria." }, 403);
    if (!limiter.consume(invite.memberId)) return json({ success: false, message: "Aguarde um minuto antes de enviar novamente." }, 429);
    const token = process.env.NOTION_FORM_TOKEN?.trim() || "";
    if (!token) return json({ success: false, message: "O recebimento de respostas ainda não foi ativado. Fale com a diretoria." }, 503);
    const storage = getResponseStoreConfig();
    if (!storage) return json({ success: false, message: "O recebimento de respostas ainda não foi ativado. Fale com a diretoria." }, 503);
    const store = createResponseStore(storage, config.members);
    const fields = "progress" in parsed.data ? parsed.data.progress : parsed.data.answer;
    if (fields.additionalTechs?.some(value => !technologyNames.has(value)) || fields.communication?.some(value => !communicationNames.has(value))) {
      return json({ success: false, message: "Confira as opções de habilidades antes de continuar." }, 400);
    }
    if ("progress" in parsed.data) {
      const { profile } = await loadMemberProfile({ token, members: config.members }, invite.memberId);
      if (fields.techs.some(value => !profile.techOptions.includes(value)) || fields.interests.some(value => !profile.interestOptions.includes(value))) {
        return json({ success: false, message: "Algumas opções mudaram. Reabra o formulário para conferir." }, 409);
      }
      await store.saveProgress(invite.memberId, parsed.data.progress);
      return json({ success: true, message: "Rascunho salvo. Reabra este link para continuar." }, 200);
    }
    const { course, availability } = parsed.data.answer;
    const { additionalTechs, communication } = parsed.data.answer;
    const previous = additionalTechs === undefined || communication === undefined ? await store.readForForm(invite.memberId) : null;
    const transaction = await store.begin(invite.memberId, {
      course, availability, submittedAt: new Date().toISOString(),
      additionalTechs: additionalTechs ?? previous?.additionalTechs,
      communication: communication ?? previous?.communication,
    });
    let notionSaved = false;
    try {
      await saveMemberProfile({ token, members: config.members }, invite.memberId, parsed.data.answer);
      notionSaved = true;
      revalidateTag("laia-notion", { expire: 0 });
      await transaction.commit();
      revalidateTag("laia-forms", { expire: 0 });
    } catch (error) {
      if (notionSaved) return json({ success: false, reloadRequired: true, message: "O Notion recebeu a atualização. Reabra o formulário para recuperar suas outras respostas e concluir o envio." }, 503);
      throw error;
    } finally { await transaction.release().catch(() => {}); }
    return json({ success: true, message: "Seu cadastro foi atualizado e suas respostas foram salvas." }, 200);
  } catch (error) {
    const known = error instanceof ProfileNotionError || error instanceof ResponseStoreError;
    return json({ success: false, message: known ? error.message : "Não foi possível confirmar o envio agora. Reabra o formulário antes de tentar novamente." }, known ? error.status : 500);
  }
}
