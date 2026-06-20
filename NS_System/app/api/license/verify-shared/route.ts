import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyLicenseWithOwnership } from "@/lib/licenses";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      license_key?: string;
      user_id?: number;
      product_id?: number;
    } | null;

    if (!body || !body.license_key || !body.user_id || !body.product_id) {
      return NextResponse.json(
        {
          status: false,
          message: "Missing license_key, user_id, or product_id",
        },
        { status: 400 },
      );
    }

    // Get caller IP address
    const forwarded = request.headers.get("x-forwarded-for");
    const callerIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const result = await verifyLicenseWithOwnership(
      body.license_key,
      Number(body.user_id),
      Number(body.product_id),
      callerIp,
    );

    if (!result.found) {
      return NextResponse.json(
        {
          status: false,
          message:
            result.reason === "not_owned"
              ? "User does not own this product"
              : "License not found",
        },
        { status: 404 },
      );
    }

    if (!result.valid) {
      return NextResponse.json(
        {
          status: false,
          message:
            result.reason === "ip_mismatch"
              ? "IP mismatch"
              : result.reason === "inactive"
                ? "License inactive"
                : "License invalid",
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
