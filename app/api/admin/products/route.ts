import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guards";
import { createAdminProduct, listAdminProducts } from "@/lib/admin";
import { adminProductSchema } from "@/lib/product-input";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const products = await listAdminProducts();
  return NextResponse.json({ ok: true, products });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = adminProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const id = await createAdminProduct(parsed.data);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create product.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
