"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Save } from "lucide-react";
import type { ProfileFormState, PublicMemberProfile } from "@/lib/forms/profile";

const inputClass = "mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus-visible:border-violet-600 focus-visible:ring-2 focus-visible:ring-violet-600/25 aria-invalid:border-rose-600";
const cardClass = "min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const groupTitleClass = "mb-4 text-base font-semibold text-slate-950";
const choiceClass = "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm leading-5 text-slate-800 hover:bg-violet-50 has-checked:border-violet-500 has-checked:bg-violet-50";
function FieldError({ name, errors }: { name: string; errors?: Record<string, string[]> }) {
  return errors?.[name]?.length ? <p id={`${name}-error`} className="mt-1 text-sm text-rose-800">{errors[name].join(" ")}</p> : null;
}

export function MemberUpdateForm({ profile, token, canSubmit, availabilityOptions }: { profile: PublicMemberProfile; token: string; canSubmit: boolean; availabilityOptions: readonly string[] }) {
  const [state, setState] = useState<ProfileFormState>({ success: false, message: "" });
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
    setPending(true);
    setState({ success: false, message: "" });
    try {
      const response = await fetch("/api/formularios/resposta", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ token, website: form.get("website") || "", answer: {
          name: form.get("name"), email: form.get("email"), phone: form.get("phone"),
          course: form.get("course"), availability: form.get("availability"),
          techs: form.getAll("techs"), interests: form.getAll("interests"), revision: profile.revision,
          confirmed: form.get("confirmed") === "on",
        } }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json() as ProfileFormState;
      setState({ ...result, success: response.ok && result.success === true });
      requestAnimationFrame(() => feedback.current?.focus());
    } catch { setState({ success: false, message: "Não foi possível confirmar o envio. Confira sua conexão e recarregue a página para verificar o cadastro antes de tentar novamente." }); }
    finally { inFlight.current = false; setPending(false); }
  }

  if (state.success) return <section ref={feedback} tabIndex={-1} role="status" className="space-y-4 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm outline-none"><CheckCircle2 className="size-10 text-emerald-700" /><h1 className="text-2xl font-semibold">Cadastro atualizado</h1><p className="text-base leading-7 text-slate-600">{state.message}</p><p className="text-sm text-slate-600">Você já pode fechar esta página.</p></section>;

  return <section aria-labelledby="profile-title" className="space-y-4">
    <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div aria-hidden="true" className="h-2 bg-gradient-to-r from-violet-700 via-violet-500 to-fuchsia-500" />
      <div className="space-y-3 p-5 sm:p-7">
        <h1 id="profile-title" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Seu perfil na LaIA</h1>
        <p className="text-base leading-6 text-slate-700">Olá, {profile.name.split(" ")[0]}! Confira seus dados e conte mais sobre sua participação na liga.</p>
        <p className="text-sm leading-6 text-slate-600">Curso e disponibilidade alimentam o dashboard. Nome, contatos, tecnologias e interesses atualizam seu cadastro no Notion.</p>
        <p className="border-t border-slate-100 pt-3 text-sm font-medium text-rose-800">* Campo obrigatório</p>
      </div>
    </header>
    {!canSubmit ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">O recebimento de respostas ainda está sendo preparado. A diretoria avisará quando você puder enviar.</p> : null}
    <form method="post" onSubmit={submit} className="space-y-4">
      <div className={cardClass}><fieldset disabled={pending} className="space-y-4"><legend className={groupTitleClass}>Seus dados</legend>
        <label className="block text-sm font-medium" htmlFor="member-name">Nome completo <span aria-hidden="true" className="text-rose-800">*</span><input id="member-name" name="name" autoComplete="name" required minLength={3} maxLength={180} defaultValue={profile.name} className={inputClass} aria-invalid={Boolean(state.fieldErrors?.name)} aria-describedby={state.fieldErrors?.name ? "name-error" : undefined} /><FieldError name="name" errors={state.fieldErrors} /></label>
        <label className="block text-sm font-medium" htmlFor="member-email">E-mail <span aria-hidden="true" className="text-rose-800">*</span><input id="member-email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={profile.email} className={inputClass} aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} /><FieldError name="email" errors={state.fieldErrors} /></label>
        <label className="block text-sm font-medium" htmlFor="member-phone">Telefone com DDD <span aria-hidden="true" className="text-rose-800">*</span><input id="member-phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} defaultValue={profile.phone} placeholder="79 99999-9999" className={inputClass} aria-invalid={Boolean(state.fieldErrors?.phone)} aria-describedby={state.fieldErrors?.phone ? "phone-error" : undefined} /><FieldError name="phone" errors={state.fieldErrors} /></label>
      </fieldset></div>
      <div className={cardClass}><fieldset disabled={pending} className="space-y-4"><legend className={groupTitleClass}>Sua participação</legend>
        <label className="block text-sm font-medium" htmlFor="member-course">Curso <span aria-hidden="true" className="text-rose-800">*</span><input id="member-course" name="course" required minLength={2} maxLength={120} defaultValue={profile.course ?? ""} placeholder="Ex.: Ciência da Computação" className={inputClass} aria-invalid={Boolean(state.fieldErrors?.course)} aria-describedby={state.fieldErrors?.course ? "course-error" : undefined} /><FieldError name="course" errors={state.fieldErrors} /></label>
        <label className="block text-sm font-medium" htmlFor="member-availability">Disponibilidade semanal para a LaIA <span aria-hidden="true" className="text-rose-800">*</span><select id="member-availability" name="availability" required defaultValue={profile.availability ?? ""} className={inputClass} aria-invalid={Boolean(state.fieldErrors?.availability)} aria-describedby={state.fieldErrors?.availability ? "availability-error" : undefined}><option value="" disabled>Selecione uma opção</option>{availabilityOptions.map(value => <option key={value} value={value}>{value}</option>)}</select><FieldError name="availability" errors={state.fieldErrors} /></label>
      </fieldset></div>
      <div className={cardClass}><fieldset disabled={pending}><legend className={groupTitleClass}>Quais tecnologias você conhece?</legend><p className="mb-3 mt-1 text-sm text-slate-600">Marque as opções que correspondem ao seu conhecimento atual.</p><div className="grid gap-2 sm:grid-cols-2">{profile.techOptions.map(value => <label key={value} className={choiceClass}><input type="checkbox" name="techs" value={value} defaultChecked={profile.techs.includes(value)} className="size-4 accent-violet-500" />{value}</label>)}</div><FieldError name="techs" errors={state.fieldErrors} /></fieldset></div>
      <div className={cardClass}><fieldset disabled={pending}><legend className={groupTitleClass}>Quais áreas de inteligência artificial lhe interessam?</legend><p className="mb-3 mt-1 text-sm text-slate-600">Você pode escolher mais de uma área.</p><div className="grid gap-2 sm:grid-cols-2">{profile.interestOptions.map(value => <label key={value} className={choiceClass}><input type="checkbox" name="interests" value={value} defaultChecked={profile.interests.includes(value)} className="size-4 shrink-0 accent-violet-500" /><span>{value}</span></label>)}</div><FieldError name="interests" errors={state.fieldErrors} /></fieldset></div>
      <label className="sr-only" aria-hidden="true">Deixe este campo vazio<input name="website" autoComplete="off" tabIndex={-1} /></label>
      <label className={`${cardClass} flex items-start gap-3 text-sm leading-6`}><input name="confirmed" type="checkbox" required disabled={pending} className="mt-1 size-4 shrink-0 accent-violet-500" /><span>Conferi as informações e quero atualizar meu cadastro. <span aria-hidden="true" className="text-rose-800">*</span></span></label><FieldError name="confirmed" errors={state.fieldErrors} />
      {state.message ? <div ref={feedback} tabIndex={-1} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950 outline-none">{state.message}</div> : null}
      {state.reloadRequired ? <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm">Reabrir com meus dados</button> : null}
      <button type="submit" disabled={pending || !canSubmit || state.reloadRequired} className="inline-flex min-h-12 w-full items-center justify-center sm:w-auto gap-2 rounded-lg bg-violet-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{pending ? "Salvando…" : "Atualizar meu cadastro"}</button>
    </form>
  </section>;
}
