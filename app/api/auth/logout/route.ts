import { NextResponse } from "next/server";

import { clearCartCookie, clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  clearCartCookie(response);
  return response;
}
