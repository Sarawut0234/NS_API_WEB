import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guards";
import { deleteAdminKey } from "@/lib/admin";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const keyId = Number.parseInt(params.id, 10);
  if (!Number.isInteger(keyId) || keyId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid key id." }, { status: 400 });
  }

  await deleteAdminKey(keyId);
  return NextResponse.json({ ok: true });
}
