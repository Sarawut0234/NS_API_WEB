import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/api-guards";
import { markOrderPaid } from "@/lib/admin";

export const runtime = "nodejs";

const schema = z.object({
  note: z.string().optional().default(""),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const orderId = Number.parseInt(params.id, 10);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid order id." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  await markOrderPaid(orderId, parsed.data.note);
  return NextResponse.json({ ok: true });
}
