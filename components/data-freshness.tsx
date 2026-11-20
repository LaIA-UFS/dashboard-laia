"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/types";

export function DataFreshness({ source }: { source: DashboardData["source"] }) {
  const router = useRouter();
  useEffect(() => {
    if (source?.mode !== "live") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [router, source?.mode]);

  if (!source) return null;
  const updated = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
  }).format(new Date(source.syncedAt));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        {source.mode === "live" ? "Notion conectado" : "Última sincronização do Notion"} · {updated}
      </span>
      <a href="https://www.notion.so/96d7067de5d182a99afc013e2446eda8" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
        Gerenciar no Notion <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
