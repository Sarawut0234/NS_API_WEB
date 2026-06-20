import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { mainDb } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

type LicenseRow = RowDataPacket & {
  id: number;
  license_key: string;
  user_id: number | null;
  product_id: number | null;
  locked_ip: string | null;
  is_active: number;
  created_at: string;
  updated_at: string | null;
  username?: string;
  product_name?: string;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const [rows] = await mainDb.execute<LicenseRow[]>(
      `
        SELECT
          l.id,
          l.license_key,
          l.user_id,
          l.product_id,
          l.locked_ip,
          l.is_active,
          l.created_at,
          l.updated_at,
          u.username,
          p.name AS product_name
        FROM licenses l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN products p ON l.product_id = p.id
        ORDER BY l.created_at DESC
      `,
    );

    const licenses = rows.map((row) => ({
      id: row.id,
      licenseKey: row.license_key,
      userId: row.user_id,
      productId: row.product_id,
      lockedIp: row.locked_ip,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      username: row.username || "N/A",
      productName: row.product_name || "N/A",
    }));

    return NextResponse.json({ ok: true, licenses });
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      licenseKey?: string;
      userId?: number | null;
      productId?: number | null;
      lockedIp?: string | null;
    } | null;

    if (!body || !body.licenseKey) {
      return NextResponse.json({ ok: false, error: "License key is required" }, { status: 400 });
    }

    const licenseKey = body.licenseKey.trim();
    const userId = body.userId || null;
    const productId = body.productId || null;
    const lockedIp = body.lockedIp?.trim() || null;

    if (!licenseKey) {
      return NextResponse.json({ ok: false, error: "License key cannot be empty" }, { status: 400 });
    }

    // Check if license key already exists
    const [existing] = await mainDb.execute<RowDataPacket[]>(
      "SELECT id FROM licenses WHERE license_key = ? LIMIT 1",
      [licenseKey],
    );

    if (existing.length > 0) {
      return NextResponse.json({ ok: false, error: "License key already exists" }, { status: 400 });
    }

    const [result] = await mainDb.execute<ResultSetHeader>(
      `
        INSERT INTO licenses (license_key, user_id, product_id, locked_ip, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, NOW())
      `,
      [licenseKey, userId, productId, lockedIp],
    );

    return NextResponse.json({
      ok: true,
      message: "License created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating license:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
