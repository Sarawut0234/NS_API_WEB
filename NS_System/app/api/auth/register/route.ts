import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, error: "Registration by email/password is disabled. Please use Discord login." },
    { status: 403 },
  );
}
