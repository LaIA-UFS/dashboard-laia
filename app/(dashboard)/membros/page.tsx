import type { Metadata } from "next";
import { DataFreshness } from "@/components/data-freshness";
import { MembersSection } from "@/components/members-section";
import { getDashboardData } from "@/lib/services/member-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Membros | SimMAP" };

export default async function MembersPage() {
  const { members, source } = await getDashboardData();
  return <main id="main-content" className="dashboard-main"><DataFreshness source={source} /><MembersSection members={members} /></main>;
}
