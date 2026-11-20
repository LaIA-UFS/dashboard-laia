"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";

export async function refreshNotionData() {
  await requireAdmin();
  updateTag("laia-notion");
}
