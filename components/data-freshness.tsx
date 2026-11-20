"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { refreshNotionData } from "@/app/(dashboard)/actions";

export function DataFreshness({ source }: { source: DashboardData["source"] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  useEffect(() => {
    if (source?.mode !== "live") return;
    let inFlight = false;
    let lastCheck = 0;
    const controller = new AbortController();
    async function check() {
      if (document.visibilityState !== "visible" || inFlight || Date.now() - lastCheck < 25000) return;
      inFlight = true;
      lastCheck = Date.now();
      try {
        const response = await fetch("/api/atualizacao", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const current = await response.json();
        if (current.syncedAt) setCheckedAt(current.syncedAt);
        if (current.revision && current.revision !== source?.revision) startTransition(() => router.refresh());
      } catch { /* Keep the current view during a temporary network failure. */ }
      finally { inFlight = false; }
    }
    const timer = setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", check);
    };
  }, [router, source?.mode, source?.revision]);

  if (!source) return null;
  const updated = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
  }).format(new Date(checkedAt ?? source.syncedAt));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span className="inline-flex flex-wrap items-center gap-2">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        {source.mode === "live" ? "Notion conectado" : "Última sincronização do Notion"} · {updated}
        <button type="button" disabled={isPending} onClick={() => startTransition(async () => { await refreshNotionData(); router.refresh(); })} className="rounded px-2 py-1 text-violet-300 hover:bg-secondary disabled:opacity-50">{isPending ? "Atualizando…" : "Atualizar"}</button>
      </span>
      <a href="https://www.notion.so/96d7067de5d182a99afc013e2446eda8" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
        Gerenciar no Notion <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
