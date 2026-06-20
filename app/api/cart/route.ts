import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/api-guards";
import { getCartFromRequest, setCartCookie } from "@/lib/session";
import { getUserPoints, sanitizeCartForUser } from "@/lib/store";

export const runtime = "nodejs";

function normalizeCart(cart: Record<string, number>): string {
  const keys = Object.keys(cart).sort((a, b) => Number(a) - Number(b));
  return JSON.stringify(keys.map((key) => [key, cart[key]]));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(request);
  if ("response" in auth) {
    return auth.response;
  }

  const user = auth.user;
  const originalCart = getCartFromRequest(request);
  const snapshot = await sanitizeCartForUser(user.id, originalCart);
  const userPoints = await getUserPoints(user.id);

  const response = NextResponse.json({
    ok: true,
    userPoints,
    totalPoints: snapshot.totalPoints,
    items: snapshot.items,
  });

  if (normalizeCart(originalCart) !== normalizeCart(snapshot.cleanedCart)) {
    setCartCookie(response, snapshot.cleanedCart);
  }

  return response;
}
