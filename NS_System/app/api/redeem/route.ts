import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api-guards";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { redeemCode } from "@/lib/store";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(1),
});

function requestIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(request);
  if ("response" in auth) {
    return auth.response;
  }
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please provide redeem code." }, { status: 400 });
  }

  const allowed = await checkRateLimit(
    `user_${user.id}`,
    "redeem",
    env.security.rateLimitRedeem,
    15 * 60,
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many redeem attempts. Please wait 15 minutes." },
      { status: 429 },
    );
  }

  try {
    const message = await redeemCode(user.id, parsed.data.code, requestIp(request));
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to redeem code.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
