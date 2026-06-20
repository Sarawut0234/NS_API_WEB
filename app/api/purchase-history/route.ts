import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { licenseDbLabel } from "@/lib/db";
import {
  getLicenseRowByUser,
  getPurchasedProducts,
  scriptNameFromProduct,
} from "@/lib/licenses";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const products = await getPurchasedProducts(user.id);

  const items = await Promise.all(
    products.map(async (product) => {
      const scriptName = scriptNameFromProduct({
        id: product.id,
        name: product.name,
        slug: product.slug,
      });

      const key = product.licenseKey.trim();
      let allowedIp = "";
      let hasLicenseRecord = false;

      if (key) {
        const row = await getLicenseRowByUser(user.id, product.id, scriptName);
        if (row) {
          allowedIp = row.allowedIp;
          hasLicenseRecord = true;
        }
      }

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        downloadUrl: product.downloadUrl,
        filePath: product.filePath,
        purchasedAt: product.purchasedAt,
        scriptName,
        licenseKey: key,
        allowedIp,
        hasLicenseRecord,
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    user,
    licenseDbLabel: isAdminUser(user) ? licenseDbLabel : null,
    products: items,
  });
}
