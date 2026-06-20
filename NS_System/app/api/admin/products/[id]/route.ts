import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guards";
import {
  deleteAdminProduct,
  getAdminProductById,
  updateAdminProduct,
} from "@/lib/admin";
import { adminProductSchema } from "@/lib/product-input";

export const runtime = "nodejs";

function parseId(value: string): number | null {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid product id." }, { status: 400 });
  }

  const product = await getAdminProductById(id);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, product });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid product id." }, { status: 400 });
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
    await updateAdminProduct(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update product.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid product id." }, { status: 400 });
  }

  await deleteAdminProduct(id);
  return NextResponse.json({ ok: true });
}
