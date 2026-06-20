import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser, type AppUser } from "@/lib/auth";

export async function requireUser(
  request: NextRequest,
): Promise<{ user: AppUser } | { response: NextResponse }> {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireAdmin(
  request: NextRequest,
): Promise<{ user: AppUser } | { response: NextResponse }> {
  const auth = await requireUser(request);
  if ("response" in auth) {
    return auth;
  }
  if (!isAdminUser(auth.user)) {
    return {
      response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  return auth;
}
