import type { Metadata } from "next";
import { getDashboardData } from "@/lib/services/member-service";
import { createResponseStore, getResponseStoreConfig, type FormStatus } from "@/lib/forms/response-store";
import { getNotionConfig } from "@/lib/notion/config";
import { MemberFormInvites } from "@/components/member-form-invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Formulários | SimMAP" };

export default async function FormsPage() {
  const { members } = await getDashboardData();
  const storage = getResponseStoreConfig();
  const ready = Boolean(process.env.NOTION_FORM_TOKEN?.trim() && storage);
  let statuses = new Map<string, FormStatus>();
  if (storage) {
    const memberIds = members.flatMap(member => member.notionId ? [member.notionId] : []);
    try { statuses = await createResponseStore(storage, getNotionConfig().members).readStatuses(memberIds); }
    catch { /* Do not display a false pending status during a Redis outage. */ }
  }
  return <main id="main-content" className="dashboard-main"><MemberFormInvites ready={ready} members={members.map(member => ({ id: member.notionId ?? "", name: member.nome, answeredAt: member.dataResposta, status: statuses.get(member.notionId ?? "") }))} /></main>;
}
