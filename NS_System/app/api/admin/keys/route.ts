import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/api-guards";
import { createAdminKeys, listAdminKeys } from "@/lib/admin";

export const runtime = "nodejs";

const createSchema = z.object({
  keyType: z.enum(["product", "points"]),
  productId: z.number().int().positive().nullable().optional(),
  pointAmount: z.number().int().nonnegative().optional().default(0),
  maxUses: z.number().int().positive().optional().default(1),
  count: z.number().int().positive().max(100).optional().default(1),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const keys = await listAdminKeys();
  return NextResponse.json({ ok: true, keys });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const created = await createAdminKeys({
      keyType: parsed.data.keyType,
      productId: parsed.data.productId ?? null,
      pointAmount: parsed.data.pointAmount,
      maxUses: parsed.data.maxUses,
      count: parsed.data.count,
    });
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create keys.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
