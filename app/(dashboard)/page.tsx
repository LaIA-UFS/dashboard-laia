import { DashboardShell } from "@/components/dashboard-shell";
import { DataFreshness } from "@/components/data-freshness";
import { getDashboardData } from "@/lib/services/member-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <main id="main-content" className="dashboard-main">
    <DataFreshness source={data.source} />
    <DashboardShell data={data} />
    <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">Desenvolvido e Cedido por <span className="font-semibold text-violet-300">LAWD</span> © 2026</footer>
  </main>;
}
