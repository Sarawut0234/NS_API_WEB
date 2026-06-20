import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { isValidIp, updateProductIp } from "@/lib/licenses";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const updateSchema = z.object({
  productId: z.number().int().positive(),
  ip: z.string().trim().min(1).max(45),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message || "Invalid request.",
      },
      { status: 400 },
    );
  }

  if (!isValidIp(parsed.data.ip)) {
    return NextResponse.json({ ok: false, error: "Invalid IP format." }, { status: 400 });
  }

  const allowed = await checkRateLimit(
    `user_${user.id}`,
    "ip_update",
    env.security.rateLimitIpUpdate,
    15 * 60,
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many IP update requests. Please wait 15 minutes." },
      { status: 429 },
    );
  }

  try {
    const updated = await updateProductIp(user.id, parsed.data.productId, parsed.data.ip);
    return NextResponse.json({
      ok: true,
      data: {
        licenseKey: updated.licenseKey,
        allowedIp: updated.allowedIp,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update IP.";
    const status = message === "Product is not owned by this user." ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
