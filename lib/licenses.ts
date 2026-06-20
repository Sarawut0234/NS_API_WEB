import { isIP } from "net";

import type { RowDataPacket } from "mysql2";

import { licenseDb, mainDb } from "@/lib/db";
import { env } from "@/lib/env";

export type PurchasedProduct = {
  id: number;
  name: string;
  slug: string;
  licenseKey: string;
  description: string;
  downloadUrl: string;
  filePath: string;
  purchasedAt: string;
};

type PurchasedProductRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string | null;
  license_key: string | null;
  description: string | null;
  download_url: string | null;
  file_path: string | null;
  created_at: string | Date;
};

type ProductRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string | null;
  license_key: string | null;
};

type LicenseRow = RowDataPacket & {
  license_key: string;
  locked_ip: string;
  is_active: number;
};

let ensuredTable: Promise<void> | null = null;

async function ensureLicensesTable(): Promise<void> {
  if (ensuredTable) {
    return ensuredTable;
  }

  ensuredTable = (async () => {
    await licenseDb.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED DEFAULT NULL,
        product_id INT UNSIGNED DEFAULT NULL,
        license_key VARCHAR(255) NOT NULL,
        locked_ip VARCHAR(45) DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_license_key (license_key),
        KEY idx_user_id (user_id),
        KEY idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  })();

  await ensuredTable;
}

export function isValidIp(ip: string): boolean {
  return isIP(ip.trim()) !== 0;
}

export async function getPurchasedProducts(userId: number): Promise<PurchasedProduct[]> {
  try {
    const [rows] = await mainDb.execute<PurchasedProductRow[]>(
      `
        SELECT
          p.id,
          p.name,
          p.slug,
          p.license_key,
          p.description,
          p.download_url,
          p.file_path,
          up.created_at
        FROM user_products up
        JOIN products p ON p.id = up.product_id
        WHERE up.user_id = ? AND p.is_active = 1
        ORDER BY up.created_at DESC
      `,
      [userId],
    );

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ""),
      slug: String(row.slug || ""),
      licenseKey: String(row.license_key || ""),
      description: String(row.description || ""),
      downloadUrl: String(row.download_url || ""),
      filePath: String(row.file_path || ""),
      purchasedAt: String(row.created_at || ""),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!message.includes("unknown column")) {
      throw error;
    }

    const [rows] = await mainDb.execute<PurchasedProductRow[]>(
      `
        SELECT
          p.id,
          p.name,
          p.slug,
          NULL AS license_key,
          p.description,
          p.download_url,
          p.file_path,
          up.created_at
        FROM user_products up
        JOIN products p ON p.id = up.product_id
        WHERE up.user_id = ? AND p.is_active = 1
        ORDER BY up.created_at DESC
      `,
      [userId],
    );

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ""),
      slug: String(row.slug || ""),
      licenseKey: "",
      description: String(row.description || ""),
      downloadUrl: String(row.download_url || ""),
      filePath: String(row.file_path || ""),
      purchasedAt: String(row.created_at || ""),
    }));
  }
}

export async function getLicenseRow(
  licenseKey: string,
): Promise<{ licenseKey: string; allowedIp: string; isActive: boolean } | null> {
  await ensureLicensesTable();

  const [rows] = await licenseDb.execute<LicenseRow[]>(
    `
      SELECT license_key, locked_ip, is_active
      FROM licenses
      WHERE license_key = ?
      LIMIT 1
    `,
    [licenseKey],
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    licenseKey: String(row.license_key),
    allowedIp: String(row.locked_ip || ""),
    isActive: row.is_active === 1,
  };
}

export async function getLicenseRowByUser(
  userId: number,
  productId: number,
): Promise<{ licenseKey: string; allowedIp: string; isActive: boolean } | null> {
  await ensureLicensesTable();

  const [rows] = await licenseDb.execute<LicenseRow[]>(
    `
      SELECT license_key, locked_ip, is_active
      FROM licenses
      WHERE user_id = ? AND product_id = ?
      LIMIT 1
    `,
    [userId, productId],
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    licenseKey: String(row.license_key),
    allowedIp: String(row.locked_ip || ""),
    isActive: row.is_active === 1,
  };
}

async function resolveUserLabel(userId: number): Promise<string> {
  if (userId <= 0) {
    return `User ID ${userId}`;
  }

  const [rows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT username, email FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (!rows.length) {
    return `User ID ${userId}`;
  }

  const username = String(rows[0].username || "").trim();
  const email = String(rows[0].email || "").trim();

  if (username && email) {
    return `${username} (${email})`;
  }
  if (username) {
    return username;
  }
  if (email) {
    return email;
  }

  return `User ID ${userId}`;
}

async function postWebhook(payload: Record<string, unknown>): Promise<void> {
  if (!env.licenseWebhook.enabled || !env.licenseWebhook.url.trim()) {
    return;
  }

  const timeoutMs = Math.max(1000, env.licenseWebhook.timeoutSeconds * 1000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(env.licenseWebhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function logIpChange(context: {
  userId: number;
  productId: number;
  licenseKey: string;
  oldIp: string;
  newIp: string;
}): Promise<void> {
  if (!env.licenseWebhook.enabled || !env.licenseWebhook.url.trim()) {
    return;
  }

  const changedBy = await resolveUserLabel(context.userId);
  const payload: Record<string, unknown> = {
    username: env.licenseWebhook.username || "NS SYSTEM",
    embeds: [
      {
        title: "License IP Updated",
        color: 5793266,
        fields: [
          { name: "License Key", value: `\`${context.licenseKey}\``, inline: true },
          { name: "Product ID", value: String(context.productId), inline: true },
          { name: "Old IP", value: `\`${context.oldIp || "-"}\``, inline: true },
          { name: "New IP", value: `\`${context.newIp}\``, inline: true },
          { name: "Changed By", value: changedBy, inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  if (env.licenseWebhook.avatarUrl.trim()) {
    payload.avatar_url = env.licenseWebhook.avatarUrl.trim();
  }

  await postWebhook(payload);
}

export async function updateProductIp(userId: number, productId: number, ip: string): Promise<{
  licenseKey: string;
  allowedIp: string;
}> {
  const trimmedIp = ip.trim();
  if (!isValidIp(trimmedIp)) {
    throw new Error("Invalid IP format.");
  }

  const [ownedRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT 1 FROM user_products WHERE user_id = ? AND product_id = ? LIMIT 1",
    [userId, productId],
  );

  if (!ownedRows.length) {
    throw new Error("Product is not owned by this user.");
  }

  const [productRows] = await mainDb.execute<ProductRow[]>(
    "SELECT id, name, slug, license_key FROM products WHERE id = ? LIMIT 1",
    [productId],
  );

  if (!productRows.length) {
    throw new Error("Product not found.");
  }

  const product = productRows[0];
  const licenseKey = String(product.license_key || "").trim();
  if (!licenseKey) {
    throw new Error("This product has no license key configured by admin.");
  }

  const current = await getLicenseRowByUser(userId, productId);
  if (!current) {
    throw new Error("License record not found. It is created only at purchase time.");
  }

  if (current.allowedIp !== trimmedIp) {
    await licenseDb.execute(
      "UPDATE licenses SET locked_ip = ? WHERE user_id = ? AND product_id = ?",
      [trimmedIp, userId, productId],
    );

    try {
      await logIpChange({
        userId,
        productId,
        licenseKey,
        oldIp: current.allowedIp,
        newIp: trimmedIp,
      });
    } catch {
      // Keep update flow successful even if webhook fails.
    }
  }

  return {
    licenseKey,
    allowedIp: trimmedIp,
  };
}

export async function assignProductLicense(
  userId: number,
  productId: number,
  defaultIp = "0.0.0.0",
): Promise<{ licenseKey: string } | null> {
  await ensureLicensesTable();

  const [rows] = await mainDb.execute<ProductRow[]>(
    "SELECT id, name, slug, license_key FROM products WHERE id = ? LIMIT 1",
    [productId],
  );
  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const licenseKey = String(row.license_key || "").trim();
  if (!licenseKey) {
    return null;
  }

  const ip = isValidIp(defaultIp) ? defaultIp.trim() : "0.0.0.0";

  await licenseDb.execute(
    `
      INSERT INTO licenses (user_id, product_id, license_key, locked_ip)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE license_key = VALUES(license_key), locked_ip = VALUES(locked_ip)
    `,
    [userId, productId, licenseKey, ip],
  );

  return { licenseKey };
}

function parseAllowedIps(ipString: string | null | undefined): string[] {
  if (!ipString) {
    return [];
  }
  return ipString
    .split(",")
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
}

function isIpAllowed(callerIp: string, allowedIpString: string | null | undefined): boolean {
  if (!allowedIpString || allowedIpString === "0.0.0.0") {
    return true; // No IP restriction
  }

  const allowedIps = parseAllowedIps(allowedIpString);
  return allowedIps.includes(callerIp);
}

export async function verifyLicense(
  licenseKey: string,
  callerIp?: string,
  userId?: number,
  productId?: number,
): Promise<{
  found: boolean;
  valid: boolean;
  reason?: string;
  allowedIp?: string;
}> {
  const key = licenseKey.trim();

  if (!key) {
    return { found: false, valid: false, reason: "missing_params" };
  }

  // If user_id and product_id are provided, check user-specific license
  if (userId && productId) {
    const userRow = await getLicenseRowByUser(userId, productId);
    if (!userRow) {
      return { found: false, valid: false, reason: "not_found" };
    }

    if (!userRow.isActive) {
      return { found: true, valid: false, reason: "inactive" };
    }

    if (callerIp && !isIpAllowed(callerIp, userRow.allowedIp)) {
      return {
        found: true,
        valid: false,
        reason: "ip_mismatch",
        allowedIp: userRow.allowedIp,
      };
    }

    return {
      found: true,
      valid: true,
      allowedIp: userRow.allowedIp,
    };
  }

  // Fallback to legacy verification (by license key only)
  const row = await getLicenseRow(key);
  if (!row) {
    return { found: false, valid: false, reason: "not_found" };
  }

  if (!row.isActive) {
    return { found: true, valid: false, reason: "inactive" };
  }

  if (callerIp && !isIpAllowed(callerIp, row.allowedIp)) {
    return {
      found: true,
      valid: false,
      reason: "ip_mismatch",
      allowedIp: row.allowedIp,
    };
  }

  return {
    found: true,
    valid: true,
    allowedIp: row.allowedIp,
  };
}

// ===== Shared Master Key Functions =====

export async function verifyLicenseWithOwnership(
  licenseKey: string,
  userId: number,
  productId: number,
  callerIp?: string,
): Promise<{
  found: boolean;
  valid: boolean;
  reason?: string;
  allowedIp?: string;
}> {
  const key = licenseKey.trim();

  if (!key || !userId || !productId) {
    return { found: false, valid: false, reason: "missing_params" };
  }

  // Check if user owns this product via purchase
  const [ownedRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT 1 FROM user_products WHERE user_id = ? AND product_id = ? LIMIT 1",
    [userId, productId],
  );

  if (!ownedRows.length) {
    return { found: false, valid: false, reason: "not_owned" };
  }

  // Get the user's license record for this product
  const userLicense = await getLicenseRowByUser(userId, productId);
  if (!userLicense) {
    return { found: false, valid: false, reason: "not_found" };
  }

  // Verify the license key matches
  if (userLicense.licenseKey !== key) {
    return { found: false, valid: false, reason: "key_mismatch" };
  }

  if (!userLicense.isActive) {
    return { found: true, valid: false, reason: "inactive" };
  }

  // Check IP if provided
  if (callerIp && !isIpAllowed(callerIp, userLicense.allowedIp)) {
    return {
      found: true,
      valid: false,
      reason: "ip_mismatch",
      allowedIp: userLicense.allowedIp,
    };
  }

  return {
    found: true,
    valid: true,
    allowedIp: userLicense.allowedIp,
  };
}

export async function getSharedLicenseUsers(
  licenseKey: string,
): Promise<Array<{ userId: number; productId: number; lockedIp: string | null; isActive: boolean }>> {
  await ensureLicensesTable();

  const [rows] = await licenseDb.execute<LicenseRow[]>(
    "SELECT user_id, product_id, locked_ip, is_active FROM licenses WHERE license_key = ? AND user_id IS NOT NULL",
    [licenseKey],
  );

  return rows.map((row) => ({
    userId: row.user_id || 0,
    productId: row.product_id || 0,
    lockedIp: row.locked_ip,
    isActive: Boolean(row.is_active),
  }));
}
