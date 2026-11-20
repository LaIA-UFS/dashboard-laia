"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search, Users, X, UserRound } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import type { Member } from "@/lib/types";

const MemberProfileModal = dynamic(() => import("@/components/member-profile-modal").then(module => module.MemberProfileModal));
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function MembersSection({ members, overview = false }: { members: Member[]; overview?: boolean }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const areas = useMemo(() => [...new Set(members.flatMap(member => member.areasAtuacao))].sort((a, b) => a.localeCompare(b, "pt-BR")), [members]);
  const statuses = useMemo(() => [...new Set(members.flatMap(member => member.status ? [member.status] : []))].sort((a, b) => a.localeCompare(b, "pt-BR")), [members]);
  const visible = useMemo(() => {
    const search = normalize(deferredQuery.trim());
    return members.filter(member => (!area || member.areasAtuacao.includes(area)) && (!status || member.status === status) && (!search || normalize([member.nome, member.nomeOriginal, ...member.areasAtuacao, ...member.techs, ...member.projetosAtuais, member.status].join(" ")).includes(search))).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [members, deferredQuery, area, status]);
  const selected = members.find(member => member.slug === selectedSlug) ?? null;
  return <section aria-labelledby="members-heading" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Users className="size-4 text-violet-300" /><h1 id="members-heading" className="text-base font-semibold">Membros</h1><span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-violet-200">{visible.length} de {members.length}</span></div>
      {overview ? <Link href="/membros" prefetch={false} className="text-sm text-violet-300 hover:underline">Abrir diretório</Link> : <p className="text-sm text-muted-foreground">Perfis, núcleos e projetos da liga</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-48 flex-1"><span className="sr-only">Buscar membros</span><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome, núcleo, tecnologia ou projeto" className="h-10 w-full rounded-lg border border-border/60 bg-card pl-9 pr-3 text-sm outline-none focus:border-violet-400" /></label>
      <label><span className="sr-only">Filtrar por núcleo</span><select value={area} onChange={event => setArea(event.target.value)} className="h-10 max-w-full rounded-lg border border-border/60 bg-card px-3 text-sm"><option value="">Todos os núcleos</option>{areas.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por cargo</span><select value={status} onChange={event => setStatus(event.target.value)} className="h-10 max-w-full rounded-lg border border-border/60 bg-card px-3 text-sm"><option value="">Todos os cargos</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label>
      {query || area || status ? <button type="button" onClick={() => { setQuery(""); setArea(""); setStatus(""); }} className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:bg-secondary"><X className="size-4" />Limpar</button> : null}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visible.map(member => <article key={member.slug} className="member-card rounded-xl border border-border/50 bg-card p-3 transition-colors hover:border-violet-400/50">
        <button type="button" onClick={() => setSelectedSlug(member.slug)} className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Ver perfil de ${member.nome}`}>
          <MemberAvatar member={member} className="h-20 w-16" sizes="64px" />
          <span className="min-w-0 space-y-1"><span className="block text-sm font-semibold leading-snug">{member.nome}</span><span className="block text-xs text-violet-200">{member.status ?? "Cargo não informado"}</span><span className="block text-xs text-muted-foreground">{member.curso ?? "Curso não informado"}{member.periodo ? ` · ${member.periodo}º período` : ""}</span></span>
        </button>
        <div className="mt-3 flex flex-wrap gap-1.5">{member.areasAtuacao.length ? member.areasAtuacao.map(value => <span key={value} className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-violet-200">{value}</span>) : <span className="text-xs text-muted-foreground">Núcleo não informado</span>}</div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/30 pt-2 text-xs text-muted-foreground"><span>{member.projetosAtuais.length} projetos em andamento</span><Link prefetch={false} href={`/membros/${member.slug}`} className="inline-flex items-center gap-1 text-violet-300 hover:underline"><UserRound className="size-3" />Perfil completo</Link></div>
      </article>)}
    </div>
    {!visible.length ? <p role="status" className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Nenhum membro encontrado. Ajuste a busca ou os filtros.</p> : null}
    {selected ? <MemberProfileModal member={selected} open={true} onOpenChange={open => { if (!open) setSelectedSlug(null); }} /> : null}
  </section>;
}
