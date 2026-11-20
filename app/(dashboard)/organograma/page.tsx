import { DataFreshness } from "@/components/data-freshness";
import { OrganogramSection } from "@/components/organogram-section";
import { getDashboardData } from "@/lib/services/member-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OrganogramaPage() {
  const { members, source } = await getDashboardData();
  return <main id="main-content" className="dashboard-main"><DataFreshness source={source} /><OrganogramSection members={members} /></main>;
}
