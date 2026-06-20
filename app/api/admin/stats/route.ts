import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guards";
import { getAdminSalesAnalytics, getAdminStats } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const [stats, analytics] = await Promise.all([getAdminStats(), getAdminSalesAnalytics()]);
  return NextResponse.json({ ok: true, stats, analytics });
}
