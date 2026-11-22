import { z } from "zod";
import { revalidateTag } from "next/cache";
import { createSubmissionLimiter, readMemberInvite } from "@/lib/forms/member-invite";
import { profileAnswerSchema } from "@/lib/forms/profile";
import { ProfileNotionError, saveMemberProfile } from "@/lib/forms/notion-profile";
import { getNotionConfig } from "@/lib/notion/config";
import { createResponseStore, getResponseStoreConfig, ResponseStoreError } from "@/lib/forms/response-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limiter = createSubmissionLimiter();
const envelope = z.object({ token: z.string().min(1).max(4096), answer: profileAnswerSchema, website: z.string().max(0).optional() }).strict();
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
    const parsed = envelope.safeParse(await limitedJson(request));
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] === "answer" ? issue.path[1] ?? "form" : issue.path[0] ?? "form");
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
    const { course, availability } = parsed.data.answer;
    const transaction = await store.begin(invite.memberId, { course, availability, submittedAt: new Date().toISOString() });
    let notionSaved = false;
    try {
      await saveMemberProfile({ token, members: config.members }, invite.memberId, parsed.data.answer);
      notionSaved = true;
      revalidateTag("laia-notion", { expire: 0 });
      await transaction.commit();
      revalidateTag("laia-forms", { expire: 0 });
    } catch (error) {
      if (notionSaved) return json({ success: false, reloadRequired: true, message: "Os dados do Notion foram atualizados, mas curso e disponibilidade ainda não foram confirmados no dashboard. Reabra o formulário para recuperar suas respostas e envie novamente." }, 503);
      throw error;
    } finally { await transaction.release().catch(() => {}); }
    return json({ success: true, message: "Seu cadastro foi atualizado. Curso e disponibilidade foram salvos para o dashboard; seus contatos, tecnologias e interesses foram atualizados no Notion." }, 200);
  } catch (error) {
    const known = error instanceof ProfileNotionError || error instanceof ResponseStoreError;
    return json({ success: false, message: known ? error.message : "Não foi possível confirmar o envio agora. Reabra o formulário antes de tentar novamente." }, known ? error.status : 500);
  }
}
