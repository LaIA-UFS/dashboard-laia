"use server";

import { requireAdmin } from "@/lib/auth/session";
import { getNotionConfig } from "@/lib/notion/config";
import { createMemberInvite } from "@/lib/forms/member-invite";
import { loadMemberProfile, ProfileNotionError } from "@/lib/forms/notion-profile";

export async function generateMemberFormLink(memberId: string) {
  await requireAdmin();
  try {
    const origin = new URL(process.env.APP_URL || "");
    if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" || (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) throw new Error();
    const config = getNotionConfig();
    await loadMemberProfile({ token: config.token || process.env.NOTION_FORM_TOKEN?.trim() || "", members: config.members }, memberId);
    const { token, expiresAt } = await createMemberInvite(memberId, config.members);
    return { success: true as const, url: `${origin.origin}/formulario/${token}`, expiresAt };
  } catch (error) {
    return { success: false as const, message: error instanceof ProfileNotionError ? error.message : "Não foi possível gerar o link. Confira o endereço do dashboard e a configuração dos formulários." };
  }
}
