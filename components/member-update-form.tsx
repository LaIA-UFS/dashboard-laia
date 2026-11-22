"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronDown, GraduationCap, Search, Sparkles } from "lucide-react";
import type { FormProgress, ProfileFormState, PublicMemberProfile } from "@/lib/forms/profile";
import { communicationGroups, technologyGroups } from "@/lib/forms/skill-catalog";
import catalog from "@/lib/forms/ufs-courses.json";

const fieldClass = "mt-2 min-h-12 w-full rounded-xl border border-[#d9d2e3] bg-[#faf9fc] px-3.5 text-base text-[#201c32] outline-none transition focus-visible:border-[#6339be] focus-visible:ring-2 focus-visible:ring-[#6339be]/25 aria-invalid:border-rose-600";
const card = "min-w-0 space-y-5 rounded-2xl border border-[#e7e0e9] bg-white p-5 shadow-[0_3px_12px_#24154307] sm:p-7";
const searchKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const courses = catalog.courses.map(([name, place, mode]) => ({ name, place, mode, value: [name, place, mode].join(" · "), search: searchKey([name, place, mode].join(" ")) }));
const empty: ProfileFormState = { success: false, message: "" };

function FieldError({ name, errors }: { name: string; errors?: Record<string, string[]> }) {
  return errors?.[name]?.length ? <p id={name + "-error"} className="mt-1.5 text-sm text-rose-800">{errors[name].join(" ")}</p> : null;
}

function Required() {
  return <span aria-hidden="true" className="ml-1 text-rose-700">*</span>;
}

function CoursePicker({ value, onChange, errors }: { value: string; onChange: (value: string) => void; errors?: Record<string, string[]> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const terms = searchKey(query.trim()).split(/\s+/);
  const results = courses.filter(course => terms.every(term => course.search.includes(term)));
  const choose = (course: string) => {
    onChange(course);
    setOpen(false);
    setQuery("");
    button.current?.focus();
  };
  return <div className="min-w-0" onKeyDown={event => {
    if (event.key === "Escape" && open) { setOpen(false); button.current?.focus(); }
  }}>
    <span id="course-label" className="text-sm font-semibold">Curso<Required /></span>
    <input type="hidden" name="course" value={value} />
    <button ref={button} id="course-trigger" type="button" aria-labelledby="course-label course-value" aria-expanded={open}
      aria-controls={open ? panelId : undefined} aria-invalid={Boolean(errors?.course)} aria-describedby={errors?.course ? "course-error" : undefined}
      onClick={() => setOpen(current => !current)} className={fieldClass + " flex items-center justify-between gap-3 py-2 text-left"}>
      <span id="course-value">{value || "Selecione seu curso na UFS"}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0" />
    </button>
    {open ? <div id={panelId} className="mt-2 rounded-xl border border-[#d9d2e3] bg-white p-3 shadow-sm">
      <label className="flex items-center gap-2 rounded-lg bg-[#f3eef9] px-3">
        <Search aria-hidden="true" className="size-4 shrink-0 text-violet-800" />
        <input autoFocus type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Pesquisar curso, campus ou modalidade"
          placeholder="Busque por curso, campus ou modalidade" className="min-h-11 w-full min-w-0 bg-transparent text-base outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-600" />
      </label>
      <p role="status" className="my-2 text-xs text-[#655b76]">{results.length} opções no catálogo da UFS</p>
      <ul className="max-h-56 space-y-0.5 overflow-y-auto overscroll-contain">
        {results.map(course => <li key={course.value}>
          <button type="button" aria-pressed={course.value === value} onClick={() => choose(course.value)}
            className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-700 aria-pressed:bg-violet-100">
            <span><span className="block text-sm font-semibold">{course.name}</span><span className="block text-xs text-[#655b76]">{course.place} · {course.mode}</span></span>
            {course.value === value ? <Check aria-hidden="true" className="size-4 shrink-0 text-violet-700" /> : null}
          </button>
        </li>)}
      </ul>
      {!results.length ? <p className="px-2 py-3 text-sm text-[#655b76]">Nenhum curso encontrado. Tente outro termo.</p> : null}
      <a href={catalog.source} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-violet-800 underline">Catálogo oficial do SIGAA/UFS</a>
    </div> : null}
    <FieldError name="course" errors={errors} />
  </div>;
}

function Choices({ values, initial, name }: { values: readonly string[]; initial: readonly string[]; name: string | ((value: string) => string) }) {
  return <div className="grid gap-2 sm:grid-cols-2">
    {values.map(value => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[#e7e0e9] px-3 py-2 text-sm leading-5 transition hover:bg-violet-50 has-checked:border-violet-600 has-checked:bg-violet-50">
      <input type="checkbox" name={typeof name === "function" ? name(value) : name} value={value}
        defaultChecked={initial.includes(value)} className="size-4 shrink-0 accent-[#6339be] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700" />
      <span>{value}</span>
    </label>)}
  </div>;
}

function ChoiceGroups({ groups, initial, name }: { groups: Record<string, readonly string[]>; initial: string[]; name: string | ((value: string) => string) }) {
  return <div className="space-y-2">{Object.entries(groups).map(([label, values]) =>
    <details key={label} open={values.some(value => initial.includes(value))} className="group rounded-xl border border-[#e7e0e9] open:bg-[#fdfbff]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 text-sm font-semibold hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-700 [&::-webkit-details-marker]:hidden">
        {label}<ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="px-3 pb-3"><Choices values={values} initial={initial} name={name} /></div>
    </details>
  )}</div>;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className={card}>
    <div><h2 className="text-xl font-bold tracking-tight">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-[#655b76]">{description}</p> : null}</div>
    {children}
  </section>;
}

function values(form: FormData, key: string) {
  return form.getAll(key).map(String);
}

function progressFrom(form: FormData): FormProgress {
  return {
    course: String(form.get("course") ?? ""),
    availability: String(form.get("availability") ?? "") as FormProgress["availability"],
    techs: values(form, "techs"),
    additionalTechs: values(form, "additionalTechs"),
    communication: values(form, "communication"),
    interests: values(form, "interests"),
  };
}

export function MemberUpdateForm({ profile, token, canSubmit, availabilityOptions }: { profile: PublicMemberProfile; token: string; canSubmit: boolean; availabilityOptions: readonly string[] }) {
  const progress = profile.progress;
  const [course, setCourse] = useState(progress?.course ?? profile.course ?? "");
  const [state, setState] = useState(empty);
  const [submitting, setSubmitting] = useState<"draft" | "final" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const technologies = new Set<string>(Object.values(technologyGroups).flat());
  const other = profile.techOptions.filter(value => !technologies.has(value));
  const groups = { ...technologyGroups, ...(other.length ? { "Outras opções do cadastro": other } : {}) };
  const initialTech = [...(progress?.techs ?? profile.techs), ...(progress?.additionalTechs ?? profile.additionalTechs ?? [])];
  const techDestination = (value: string) => profile.techOptions.includes(value) ? "techs" : "additionalTechs";

  async function send(kind: "draft" | "final") {
    if (!formRef.current || inFlight.current || !canSubmit) return;
    const form = new FormData(formRef.current);
    const selections = progressFrom(form);
    if (kind === "final" && !selections.course) {
      setState({ success: false, message: "Selecione seu curso.", fieldErrors: { course: ["Selecione uma opção do catálogo."] } });
      document.getElementById("course-trigger")?.focus();
      return;
    }
    setState(empty);
    setDraftNotice("");
    inFlight.current = true;
    setSubmitting(kind);
    try {
      const payload = kind === "draft" ? { progress: selections } : { answer: {
        ...selections, name: form.get("name"), email: form.get("email"), phone: form.get("phone"),
        revision: profile.revision, confirmed: form.get("confirmed") === "on",
      } };
      const response = await fetch("/api/formularios/resposta", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ token, website: form.get("website") || "", ...payload }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json() as ProfileFormState;
      if (response.ok && result.success && kind === "draft") {
        setDraftNotice(result.message);
        setDirty(false);
      } else {
        setState({ ...result, success: response.ok && result.success === true });
        requestAnimationFrame(() => feedback.current?.focus());
      }
    } catch {
      setState({ success: false, message: "Não foi possível confirmar o salvamento. Verifique a conexão e tente novamente." });
    } finally {
      inFlight.current = false;
      setSubmitting(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send("final");
  }

  if (state.success) return <div ref={feedback} tabIndex={-1} role="status" className={card + " outline-none"}>
    <CheckCircle2 aria-hidden="true" className="size-10 text-emerald-700" />
    <h1 className="text-3xl font-bold tracking-tight">Cadastro atualizado</h1>
    <p className="text-[#655b76]">{state.message} Você já pode fechar esta página.</p>
  </div>;

  return <div className="space-y-4">
    <header className="relative isolate overflow-hidden rounded-[1.65rem] bg-[#261a43] p-6 text-white sm:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,#8250bf_0%,transparent_60%)]" />
      <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#dfccff]"><Sparkles aria-hidden="true" className="size-4" /> Cadastro de membros</div>
      <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Seu perfil na LaIA</h1>
      <p className="mt-3 max-w-lg text-base leading-6 text-[#f0e8fc]">Olá, {profile.name.split(" ")[0]}! Confira seus dados e conte como você quer participar da liga.</p>
    </header>
    <p className="px-1 text-sm text-[#655b76]"><Required /> Campo obrigatório</p>
    {!canSubmit ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">O recebimento de respostas está indisponível. Fale com a diretoria.</p> : null}
    <form method="post" onSubmit={submit} ref={formRef} className="space-y-4">
      <fieldset disabled={submitting !== null} className="min-w-0 space-y-4">
        <Section title="Seus dados" description="O envio atualiza seus dados de contato no Notion.">
          {([
            ["name", "Nome completo", "text", "name", profile.name, 180, 3],
            ["email", "E-mail", "email", "email", profile.email, 254, undefined],
            ["phone", "Telefone com DDD", "tel", "tel", profile.phone, 30, undefined],
          ] as const).map(([name, label, type, autoComplete, initial, maxLength, minLength]) =>
            <div key={name}>
              <label htmlFor={"form-" + name} className="text-sm font-semibold">{label}<Required /></label>
              <input id={"form-" + name} name={name} type={type} autoComplete={autoComplete} required defaultValue={initial}
                maxLength={maxLength} minLength={minLength} className={fieldClass} aria-invalid={Boolean(state.fieldErrors?.[name])}
                aria-describedby={state.fieldErrors?.[name] ? name + "-error" : undefined} />
              <FieldError name={name} errors={state.fieldErrors} />
            </div>)}
        </Section>
        <Section title="Sua participação" description="Curso e disponibilidade semanal alimentam o dashboard.">
          <CoursePicker value={course} onChange={next => { if (next !== course) setDirty(true); setCourse(next); }} errors={state.fieldErrors} />
          <div onChange={() => setDirty(true)}>
            <label htmlFor="form-availability" className="text-sm font-semibold">Disponibilidade semanal para a LaIA<Required /></label>
            <select id="form-availability" name="availability" required defaultValue={progress?.availability ?? profile.availability ?? ""} className={fieldClass}
              aria-invalid={Boolean(state.fieldErrors?.availability)} aria-describedby={state.fieldErrors?.availability ? "availability-error" : undefined}>
              <option value="" disabled>Selecione uma opção</option>
              {availabilityOptions.map(option => <option key={option}>{option}</option>)}
            </select>
            <FieldError name="availability" errors={state.fieldErrors} />
          </div>
        </Section>
        <Section title="Quais tecnologias você conhece?" description="Abra as categorias e marque as opções que correspondem ao seu conhecimento.">
          <div onChange={() => setDirty(true)}><ChoiceGroups groups={groups} initial={initialTech} name={techDestination} /></div>
          <FieldError name="techs" errors={state.fieldErrors} /><FieldError name="additionalTechs" errors={state.fieldErrors} />
        </Section>
        <Section title="Quais áreas de inteligência artificial lhe interessam?" description="Você pode escolher mais de uma área.">
          <div onChange={() => setDirty(true)}><Choices name="interests" values={profile.interestOptions} initial={progress?.interests ?? profile.interests} /></div>
          <FieldError name="interests" errors={state.fieldErrors} />
        </Section>
        <Section title="Comunicação e criação" description="Marque as habilidades que você pode oferecer à liga. Esta parte é opcional.">
          <div onChange={() => setDirty(true)}><ChoiceGroups groups={communicationGroups} initial={progress?.communication ?? profile.communication ?? []} name="communication" /></div>
          <FieldError name="communication" errors={state.fieldErrors} />
        </Section>
        <div className={card}>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" name="confirmed" required className="mt-1 size-4 shrink-0 accent-[#6339be]" />
            <span>Conferi as informações e quero atualizar meu cadastro.<Required /></span>
          </label>
          <FieldError name="confirmed" errors={state.fieldErrors} />
        </div>
      </fieldset>
      <label aria-hidden="true" className="sr-only">Deixe em branco<input tabIndex={-1} name="website" autoComplete="off" /></label>
      {state.message ? <div ref={feedback} tabIndex={-1} role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">{state.message}</div> : null}
      {state.reloadRequired ? <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl border border-[#d9d2e3] bg-white px-4 text-sm">Reabrir com meus dados</button> : null}
      {draftNotice ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{draftNotice}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={!canSubmit || submitting !== null || state.reloadRequired}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#5931a8] px-5 font-semibold text-white transition hover:bg-[#462383] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:opacity-50 motion-reduce:transition-none">
          {submitting === "final" ? "Salvando…" : "Atualizar meu cadastro"}<ArrowRight aria-hidden="true" className="size-4" />
        </button>
        <button type="button" disabled={!canSubmit || !dirty || submitting !== null || state.reloadRequired} onClick={() => void send("draft")}
          className="min-h-12 rounded-xl border border-[#d9d2e3] bg-white px-5 text-sm font-semibold text-[#48287f] transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:opacity-50 motion-reduce:transition-none">
          {submitting === "draft" ? "Salvando rascunho…" : "Salvar rascunho"}
        </button>
      </div>
      <p className="flex items-start gap-2 px-1 text-xs leading-5 text-[#655b76]"><GraduationCap aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> O rascunho guarda curso, disponibilidade e seleções. Alterações de contato são salvas no envio final.</p>
    </form>
  </div>;
}
