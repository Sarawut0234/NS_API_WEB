import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, error: "Email/password login is disabled. Please use Discord login." },
    { status: 403 },
  );
}
