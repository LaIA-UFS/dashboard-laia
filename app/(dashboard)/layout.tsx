import { cookies } from "next/headers";
import { AppFrame } from "@/components/app-frame";
import { requireAdmin } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const collapsed = (await cookies()).get("laia-sidebar")?.value === "collapsed";
  return <AppFrame initiallyCollapsed={collapsed}>{children}</AppFrame>;
}
