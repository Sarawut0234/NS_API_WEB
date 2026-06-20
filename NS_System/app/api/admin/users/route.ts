import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guards";
import { listAdminUsers } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const users = await listAdminUsers();
  return NextResponse.json({ ok: true, users });
}
