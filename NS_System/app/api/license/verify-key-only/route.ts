import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSharedLicenseUsers } from "@/lib/licenses";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      license_key?: string;
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

    // Get all users with this license key
    const users = await getSharedLicenseUsers(body.license_key);

    if (!users.length) {
      return NextResponse.json(
        {
          status: false,
          message: "License key not found",
        },
        { status: 404 },
      );
    }

    // Check if any user has this IP allowed
    for (const user of users) {
      if (!user.isActive) {
        continue;
      }

      // If no IP is locked (0.0.0.0), allow all IPs
      if (!user.lockedIp || user.lockedIp === "0.0.0.0") {
        return NextResponse.json({
          status: true,
          message: "License verified",
          user_id: user.userId,
          product_id: user.productId,
          allowed_ip: user.lockedIp || "0.0.0.0",
        });
      }

      // Check if caller IP matches any of the allowed IPs
      const allowedIps = user.lockedIp
        .split(",")
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);

      if (allowedIps.includes(callerIp)) {
        return NextResponse.json({
          status: true,
          message: "License verified",
          user_id: user.userId,
          product_id: user.productId,
          allowed_ip: user.lockedIp,
        });
      }
    }

    // If we reach here, the key exists but IP doesn't match any user
    return NextResponse.json(
      {
        status: false,
        message: "IP not authorized for this license key",
        caller_ip: callerIp,
      },
      { status: 403 },
    );
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
