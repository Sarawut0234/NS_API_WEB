import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyLicense } from "@/lib/licenses";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      license_key?: string;
      user_id?: number;
      product_id?: number;
    } | null;

    if (!body || !body.license_key) {
      return NextResponse.json(
        {
          status: false,
          message: "Missing license_key",
        },
        { status: 400 },
      );
    }

    // Get caller IP address
    const forwarded = request.headers.get("x-forwarded-for");
    const callerIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const result = await verifyLicense(
      body.license_key,
      callerIp,
      body.user_id ? Number(body.user_id) : undefined,
      body.product_id ? Number(body.product_id) : undefined,
    );

    if (!result.found) {
      return NextResponse.json(
        {
          status: false,
          message: "License not found",
        },
        { status: 404 },
      );
    }

    if (!result.valid) {
      return NextResponse.json(
        {
          status: false,
          message: result.reason === "ip_mismatch" ? "IP mismatch" : "License invalid or inactive",
          allowed_ip: result.allowedIp,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      status: true,
      message: "License verified",
      allowed_ip: result.allowedIp,
    });
  } catch (error) {
    console.error("License verification error:", error);
    return NextResponse.json(
      {
        status: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
