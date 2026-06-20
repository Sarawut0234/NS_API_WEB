import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { mainDb } from "@/lib/db";
import type { ResultSetHeader } from "mysql2/promise";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const licenseId = Number.parseInt(params.id, 10);
    if (!Number.isInteger(licenseId) || licenseId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid license ID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      lockedIp?: string | null;
      isActive?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: "Request body is required" }, { status: 400 });
    }

    const lockedIp = body.lockedIp?.trim() || null;
    const isActive = body.isActive !== false ? 1 : 0;

    const [result] = await mainDb.execute<ResultSetHeader>(
      `
        UPDATE licenses
        SET locked_ip = ?, is_active = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [lockedIp, isActive, licenseId],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ ok: false, error: "License not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "License updated successfully",
    });
  } catch (error) {
    console.error("Error updating license:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const licenseId = Number.parseInt(params.id, 10);
    if (!Number.isInteger(licenseId) || licenseId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid license ID" }, { status: 400 });
    }

    const [result] = await mainDb.execute<ResultSetHeader>(
      "DELETE FROM licenses WHERE id = ?",
      [licenseId],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ ok: false, error: "License not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "License deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting license:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
