import type { Metadata } from "next";
import Image from "next/image";
import { readMemberInvite } from "@/lib/forms/member-invite";
import { loadMemberProfile, ProfileNotionError } from "@/lib/forms/notion-profile";
import { getNotionConfig } from "@/lib/notion/config";
import { MemberUpdateForm } from "@/components/member-update-form";
import { AVAILABILITY_OPTIONS } from "@/lib/forms/profile";
import { createResponseStore, getResponseStoreConfig } from "@/lib/forms/response-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atualize seu cadastro | LaIA", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function MemberFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const config = getNotionConfig();
  const invite = await readMemberInvite(token, config.members);
  const storage = getResponseStoreConfig();
  let profile;
  let message = "Este link é inválido ou expirou. Solicite um novo link à diretoria da LaIA.";
  if (invite) {
    try {
      const current = (await loadMemberProfile({ token: config.token || process.env.NOTION_FORM_TOKEN?.trim() || "", members: config.members }, invite.memberId)).profile;
      const extra = storage ? await createResponseStore(storage, config.members).readForForm(invite.memberId) : null;
      profile = { ...current, course: extra?.course, availability: extra?.availability };
    }
    catch (error) { message = error instanceof ProfileNotionError ? error.message : "O formulário está temporariamente indisponível. Tente novamente em instantes."; }
  }
  return <main className="min-h-screen bg-background bg-grid px-4 py-8 text-foreground sm:py-12">
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center gap-3"><Image src="/logo-mark.webp" alt="LaIA" width={48} height={48} /><div><p className="text-lg font-semibold">LaIA</p><p className="text-sm text-muted-foreground">Liga Acadêmica de Inteligência Artificial</p></div></header>
      {profile ? <MemberUpdateForm profile={profile} token={token} availabilityOptions={AVAILABILITY_OPTIONS} canSubmit={Boolean(process.env.NOTION_FORM_TOKEN?.trim() && storage)} /> : <section className="rounded-xl border border-border bg-card p-6"><h1 className="text-xl font-semibold">Não foi possível abrir o cadastro</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p></section>}
      <footer className="text-center text-xs leading-5 text-muted-foreground">Este é um link individual. Compartilhe-o apenas com o titular do cadastro.</footer>
    </div>
  </main>;
}
