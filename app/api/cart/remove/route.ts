import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api-guards";
import { getCartFromRequest, setCartCookie } from "@/lib/session";
import { removeFromCart, sanitizeCartForUser } from "@/lib/store";

export const runtime = "nodejs";

const schema = z.object({
  productId: z.number().int().positive(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(request);
  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const existing = getCartFromRequest(request);
  const snapshot = await sanitizeCartForUser(auth.user.id, existing);
  const next = removeFromCart(snapshot.cleanedCart, parsed.data.productId);

  const response = NextResponse.json({ ok: true });
  setCartCookie(response, next);
  return response;
}
