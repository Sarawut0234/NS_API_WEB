import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/api-guards";
import { getCartFromRequest } from "@/lib/session";
import {
  getOwnedProductIds,
  getStoreProducts,
  getUserPoints,
  sanitizeCartForUser,
} from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(request);
  if ("response" in auth) {
    return auth.response;
  }
  const user = auth.user;

  const category = request.nextUrl.searchParams.get("cat")?.trim().toLowerCase() || "all";
  const products = await getStoreProducts(category);
  const owned = await getOwnedProductIds(user.id);
  const userPoints = await getUserPoints(user.id);

  const cart = getCartFromRequest(request);
  const cartSnapshot = await sanitizeCartForUser(user.id, cart);
  const cartCount = Object.values(cartSnapshot.cleanedCart).reduce((sum, qty) => sum + qty, 0);

  return NextResponse.json({
    ok: true,
    user,
    userPoints,
    category,
    cartCount,
    products: products.map((product) => ({
      ...product,
      owned: owned.has(product.id),
      isOutOfStock: product.stockQuantity <= 0,
      downloadHref: product.downloadUrl
        ? product.downloadUrl
        : product.filePath
          ? `/api/download?product=${product.id}`
          : "",
    })),
  });
}
