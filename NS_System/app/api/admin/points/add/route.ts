import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/api-guards";
import { addPointsByEmail } from "@/lib/admin";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email("Please provide valid email."),
  points: z.number().int().positive("Points must be greater than 0."),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const result = await addPointsByEmail(parsed.data.email, parsed.data.points);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add points.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
