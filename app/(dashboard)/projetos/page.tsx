import type { Metadata } from "next";
import { DataFreshness } from "@/components/data-freshness";
import { ProjectsGallery } from "@/components/projects-gallery";
import { getDashboardData } from "@/lib/services/member-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projetos | SimMAP", description: "Projetos da LaIA com status, prioridade, responsáveis e equipe." };

export default async function ProjectsPage() {
  const data = await getDashboardData();
  return <main id="main-content" className="dashboard-main">
    <DataFreshness source={data.source} />
    <ProjectsGallery projects={data.projects} members={data.members} />
    <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">Mapa consolidado de projetos da <span className="text-violet-300">LaIA</span> © 2026</footer>
  </main>;
}
