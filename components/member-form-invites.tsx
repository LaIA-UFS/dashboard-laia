"use client";

import { useState } from "react";
import { ClipboardList, Copy, ExternalLink, Link2, LoaderCircle, Search } from "lucide-react";
import { generateMemberFormLink } from "@/app/(dashboard)/formularios/actions";

interface MemberRow { id: string; name: string; answeredAt: string | null }
interface Invite { url: string; expiresAt: number }
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function MemberFormInvites({ members, ready }: { members: MemberRow[]; ready: boolean }) {
  const [search, setSearch] = useState("");
  const [invites, setInvites] = useState<Record<string, Invite>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function generate(member: MemberRow) {
    setPending(member.id); setMessage("");
    try {
      const result = await generateMemberFormLink(member.id);
      if (result.success) setInvites(current => ({ ...current, [member.id]: { url: result.url, expiresAt: result.expiresAt } }));
      else setMessage(result.message);
    } catch { setMessage("Não foi possível gerar o link agora. Tente novamente."); }
    finally { setPending(null); }
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setMessage("Link copiado. Envie-o somente ao titular do cadastro."); }
    catch { setMessage("Não foi possível copiar automaticamente. Selecione o endereço exibido e copie-o."); }
  }
  const visible = members.filter(member => normalized(member.name).includes(normalized(search)));
  const answered = members.filter(member => member.answeredAt).length;
  return <section className="space-y-5 py-4">
    <header className="space-y-2"><div className="flex items-center gap-2"><ClipboardList className="size-5 text-violet-300" /><h1 className="text-xl font-semibold">Formulários de membros</h1></div><p className="max-w-3xl text-sm leading-6 text-muted-foreground">Gere um link individual para cada membro atualizar seu cadastro. Os links valem por 7 dias. Curso e disponibilidade alimentam o dashboard; nome, contatos, tecnologias e interesses atualizam os campos existentes no Notion.</p><p className="text-xs text-muted-foreground">{answered} de {members.length} membros responderam. Nenhum convite é enviado automaticamente.</p></header>
    {!ready ? <div role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Você já pode pré-visualizar os formulários. Para receber respostas, falta configurar a conexão de atualização do Notion e o armazenamento das respostas do dashboard. A cópia dos convites será liberada quando essas conexões forem configuradas.</div> : null}
    <label className="relative block max-w-md"><span className="sr-only">Buscar membro</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Buscar membro…" className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-violet-400" /></label>
    <p role="status" aria-live="polite" className="text-sm text-violet-200">{message}</p>
    <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card">{visible.map(member => {
      const invite = invites[member.id];
      return <article key={member.id} className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{member.name}</h2><p className="mt-1 text-xs text-muted-foreground">{member.answeredAt ? `Última resposta: ${new Date(member.answeredAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Aguardando resposta"}</p></div><button type="button" disabled={!member.id || pending !== null} onClick={() => generate(member)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 text-xs font-medium text-violet-200 hover:bg-violet-400/20 disabled:opacity-50">{pending === member.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}{invite ? "Gerar novo link" : ready ? "Gerar link" : "Gerar prévia"}</button></div>
        {invite ? <div className="space-y-2"><label className="block text-xs text-muted-foreground">Link individual<input aria-label={`Link de ${member.name}`} readOnly value={invite.url} onFocus={event => event.target.select()} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs" /></label><div className="flex flex-wrap items-center gap-3 text-xs"><button type="button" disabled={!ready} onClick={() => copy(invite.url)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-white disabled:opacity-40"><Copy className="size-3" />Copiar convite</button><a href={invite.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-violet-200"><ExternalLink className="size-3" />Pré-visualizar</a><span className="text-muted-foreground">Válido até {new Date(invite.expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span></div></div> : null}
      </article>;
    })}{!visible.length ? <p className="p-5 text-sm text-muted-foreground">Nenhum membro encontrado.</p> : null}</div>
  </section>;
}
