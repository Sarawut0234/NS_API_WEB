import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user, isAdmin: isAdminUser(user) });
}
