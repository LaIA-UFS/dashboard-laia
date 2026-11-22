import { createHmac } from "node:crypto";
import { sealData, unsealData } from "iron-session";

export const INVITE_SECONDS = 7 * 24 * 60 * 60;
const PURPOSE = "laia-member-profile-v1";
const UUID = /^[a-f\d]{8}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{12}$/i;

export interface MemberInvite {
  purpose: typeof PURPOSE;
  memberId: string;
  sourceId: string;
  expiresAt: number;
}

function password(env: NodeJS.ProcessEnv) {
  const secret = env.MEMBER_FORM_SECRET?.trim() || env.SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("A chave dos formulários não foi configurada.");
  return createHmac("sha256", secret).update(PURPOSE).digest("hex");
}

export async function createMemberInvite(memberId: string, sourceId: string, env: NodeJS.ProcessEnv = process.env) {
  if (!UUID.test(memberId) || !UUID.test(sourceId)) throw new Error("Cadastro inválido.");
  const invite: MemberInvite = { purpose: PURPOSE, memberId, sourceId, expiresAt: Date.now() + INVITE_SECONDS * 1000 };
  const token = await sealData(invite, { password: password(env), ttl: INVITE_SECONDS });
  return { token, expiresAt: invite.expiresAt };
}

export async function readMemberInvite(token: string, sourceId: string, env: NodeJS.ProcessEnv = process.env, now = Date.now()): Promise<MemberInvite | null> {
  if (!token || token.length > 4096 || !UUID.test(sourceId)) return null;
  try {
    const invite = await unsealData<Partial<MemberInvite>>(token, { password: password(env), ttl: INVITE_SECONDS });
    if (invite.purpose !== PURPOSE || !UUID.test(invite.memberId ?? "") || invite.sourceId?.replaceAll("-", "").toLowerCase() !== sourceId.replaceAll("-", "").toLowerCase() || typeof invite.expiresAt !== "number" || invite.expiresAt <= now || invite.expiresAt > now + INVITE_SECONDS * 1000 + 60000) return null;
    return invite as MemberInvite;
  } catch { return null; }
}

export function createSubmissionLimiter() {
  const entries = new Map<string, { count: number; until: number }>();
  return {
    consume(memberId: string, now = Date.now()) {
      for (const [key, entry] of entries) if (entry.until <= now) entries.delete(key);
      const entry = entries.get(memberId);
      if (entry && entry.count >= 5) return false;
      if (!entry && entries.size >= 2000) return false;
      entries.set(memberId, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? now + 60000 });
      return true;
    },
  };
}
