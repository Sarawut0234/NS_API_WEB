import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/api-guards";
import { clearCartCookie, getCartFromRequest } from "@/lib/session";
import { checkoutCart, sanitizeCartForUser } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(request);
  if ("response" in auth) {
    return auth.response;
  }
  const user = auth.user;

  const existing = getCartFromRequest(request);
  const snapshot = await sanitizeCartForUser(user.id, existing);
  if (Object.keys(snapshot.cleanedCart).length === 0) {
    return NextResponse.json({ ok: false, error: "cart_empty" }, { status: 400 });
  }

  try {
    const result = await checkoutCart(user.id, snapshot.cleanedCart);
    const response = NextResponse.json({
      ok: true,
      productNames: result.productNames,
    });
    clearCartCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    const known = ["stock", "points", "cart_empty", "owned", "checkout_busy"];
    const finalError = known.includes(message) ? message : "checkout_failed";
    return NextResponse.json({ ok: false, error: finalError }, { status: 400 });
  }
}
