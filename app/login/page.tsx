import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acesso administrativo | LaIA", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/");
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-grid px-5 py-10">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="relative w-full max-w-md space-y-7">
        <div className="flex items-center justify-center gap-3">
          <Image src="/logo.png" alt="LaIA" width={72} height={72} priority className="object-contain" />
          <div><p className="text-2xl font-bold tracking-tight">SimMAP</p><p className="text-xs text-muted-foreground">Liga Acadêmica de Inteligência Artificial</p></div>
        </div>
        <section aria-labelledby="login-title" className="rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(30,26,50,0.96),rgba(13,16,27,0.98))] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.3)] sm:p-9">
          <div className="mb-7 space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Área restrita</span>
            <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Acesso administrativo</h1>
            <p className="text-sm leading-6 text-muted-foreground">Entre para acompanhar os membros e projetos da LaIA.</p>
          </div>
          <AdminLoginForm />
        </section>
        <p className="text-center text-xs text-muted-foreground">Acesso exclusivo à administração da LaIA.</p>
      </div>
    </main>
  );
}
