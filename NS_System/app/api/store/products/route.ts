import { NextRequest, NextResponse } from "next/server";

import { getStoreProducts } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const category = request.nextUrl.searchParams.get("cat")?.trim().toLowerCase() || "all";
  const products = await getStoreProducts(category);
  return NextResponse.json({ ok: true, category, products });
}
