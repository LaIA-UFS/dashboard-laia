import { getAdminSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/member-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { source } = await getDashboardData();
    return Response.json({ revision: source?.revision, syncedAt: source?.syncedAt }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível atualizar agora" }, { status: 503 });
  }
}
