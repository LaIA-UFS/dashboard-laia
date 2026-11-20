import { notFound } from "next/navigation";
import { DataFreshness } from "@/components/data-freshness";
import { MemberProfileContent } from "@/components/member-profile-content";
import { MemberServiceError, getDashboardData, getMemberBySlug } from "@/lib/services/member-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { source } = await getDashboardData();
  let member;
  try { member = await getMemberBySlug(id); }
  catch (error) {
    if (error instanceof MemberServiceError && error.status === 404) notFound();
    throw error;
  }
  return <main id="main-content" className="dashboard-main"><DataFreshness source={source} /><MemberProfileContent member={member} mode="page" /></main>;
}
