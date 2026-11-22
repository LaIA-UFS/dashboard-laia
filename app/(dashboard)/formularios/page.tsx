import type { Metadata } from "next";
import { getDashboardData } from "@/lib/services/member-service";
import { getResponseStoreConfig } from "@/lib/forms/response-store";
import { MemberFormInvites } from "@/components/member-form-invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Formulários | SimMAP" };

export default async function FormsPage() {
  const { members } = await getDashboardData();
  const ready = Boolean(process.env.NOTION_FORM_TOKEN?.trim() && getResponseStoreConfig());
  return <main id="main-content" className="dashboard-main"><MemberFormInvites ready={ready} members={members.map(member => ({ id: member.notionId ?? "", name: member.nome, answeredAt: member.dataResposta }))} /></main>;
}
