import { getDashboardData } from "@/lib/services/member-service";
import { getAdminSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!await getAdminSession()) {
    return Response.json({ error: "Acesso não autorizado." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const data = await getDashboardData();
    return Response.json({
      mode: data.source?.mode,
      syncedAt: data.source?.syncedAt,
      members: data.members.length,
      projects: data.projects.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível consultar a integração com o Notion." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
