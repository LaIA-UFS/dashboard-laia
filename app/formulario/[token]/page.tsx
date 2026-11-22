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
  return <main className="min-h-dvh bg-[#f4f2fa] px-4 py-6 font-sans text-slate-900 sm:py-10 [color-scheme:light]">
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-3"><Image src="/logo-mark.webp" alt="" width={42} height={42} className="rounded-xl bg-violet-950 p-1" /><div><p className="text-lg font-semibold">LaIA</p><p className="text-sm text-slate-600">Liga Acadêmica de Inteligência Artificial</p></div></header>
      {profile ? <MemberUpdateForm profile={profile} token={token} availabilityOptions={AVAILABILITY_OPTIONS} canSubmit={Boolean(process.env.NOTION_FORM_TOKEN?.trim() && storage)} /> : <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-semibold">Não foi possível abrir o cadastro</h1><p className="mt-3 text-sm leading-6 text-slate-600">{message}</p></section>}
      <footer className="text-center text-xs leading-5 text-slate-600">Este é um link individual. Compartilhe-o apenas com o titular do cadastro.</footer>
    </div>
  </main>;
}
