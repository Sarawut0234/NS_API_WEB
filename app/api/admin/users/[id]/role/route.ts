import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/api-guards";
import { setAdminUserRole } from "@/lib/admin";

export const runtime = "nodejs";

const schema = z.object({
  role: z.enum(["member", "admin"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const userId = Number.parseInt(params.id, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid user id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }

  await setAdminUserRole(userId, parsed.data.role);
  return NextResponse.json({ ok: true });
}
