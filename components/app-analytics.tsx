"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";

export function AppAnalytics() {
  const pathname = usePathname();
  if (pathname.startsWith("/formulario/")) return null;
  // Also filter navigations after the script has mounted on another route.
  return <Analytics beforeSend={event => new URL(event.url).pathname.startsWith("/formulario/") ? null : event} />;
}
