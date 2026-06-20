import path from "path";

import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { mainDb } from "@/lib/db";
import { env } from "@/lib/env";
import { assignProductLicense } from "@/lib/licenses";

export type StoreProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  extraInfo: string;
  changelogText: string;
  versionLabel: string;
  price: number;
  isFree: boolean;
  pointPrice: number;
  stockQuantity: number;
  category: string;
  imageUrl: string;
  reviewVideoUrl: string;
  downloadUrl: string;
  filePath: string;
  isActive: boolean;
  licenseKey: string;
};

export type CartItem = {
  productId: number;
  name: string;
  qty: number;
  pointPrice: number;
  linePoints: number;
  stockQuantity: number;
};

type ProductRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string | null;
  license_key: string | null;
  description: string | null;
  extra_info: string | null;
  changelog_text: string | null;
  version_label: string | null;
  price: number | string | null;
  is_free: number | null;
  point_price: number | null;
  stock_quantity: number | null;
  category: string | null;
  image_url: string | null;
  review_video_url: string | null;
  download_url: string | null;
  file_path: string | null;
  is_active: number | null;
};

type OwnedRow = RowDataPacket & {
  product_id: number;
};

type CheckoutItem = {
  productId: number;
  name: string;
  qty: number;
  pointPrice: number;
  price: number;
  isFree: boolean;
  stockQuantity: number;
};

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeProduct(row: ProductRow): StoreProduct {
  return {
    id: Number(row.id),
    name: String(row.name || ""),
    slug: String(row.slug || ""),
    licenseKey: String(row.license_key || ""),
    description: String(row.description || ""),
    extraInfo: String(row.extra_info || ""),
    changelogText: String(row.changelog_text || ""),
    versionLabel: String(row.version_label || ""),
    price: toNumber(row.price, 0),
    isFree: Number(row.is_free || 0) === 1,
    pointPrice: toNumber(row.point_price, 0),
    stockQuantity: toNumber(row.stock_quantity, 0),
    category: String(row.category || "all"),
    imageUrl: String(row.image_url || ""),
    reviewVideoUrl: String(row.review_video_url || ""),
    downloadUrl: String(row.download_url || ""),
    filePath: String(row.file_path || ""),
    isActive: Number(row.is_active || 0) === 1,
  };
}

export async function getStoreProducts(category = "all"): Promise<StoreProduct[]> {
  const safeCategory = category.trim().toLowerCase();
  const hasCategory = safeCategory && safeCategory !== "all";

  const query = hasCategory
    ? `
        SELECT
          id,
          name,
          slug,
          IFNULL(license_key, '') AS license_key,
          description,
          extra_info,
          changelog_text,
          version_label,
          price,
          is_free,
          IFNULL(point_price, 0) AS point_price,
          IFNULL(stock_quantity, 0) AS stock_quantity,
          IFNULL(category, 'all') AS category,
          image_url,
          review_video_url,
          download_url,
          file_path,
          is_active
        FROM products
        WHERE is_active = 1
          AND (category = ? OR category = 'all')
        ORDER BY name
      `
    : `
        SELECT
          id,
          name,
          slug,
          IFNULL(license_key, '') AS license_key,
          description,
          extra_info,
          changelog_text,
          version_label,
          price,
          is_free,
          IFNULL(point_price, 0) AS point_price,
          IFNULL(stock_quantity, 0) AS stock_quantity,
          IFNULL(category, 'all') AS category,
          image_url,
          review_video_url,
          download_url,
          file_path,
          is_active
        FROM products
        WHERE is_active = 1
        ORDER BY name
      `;

  const [rows] = hasCategory
    ? await mainDb.execute<ProductRow[]>(query, [safeCategory])
    : await mainDb.execute<ProductRow[]>(query);

  return rows.map(normalizeProduct);
}

export async function getOwnedProductIds(userId: number): Promise<Set<number>> {
  const [rows] = await mainDb.execute<OwnedRow[]>(
    "SELECT product_id FROM user_products WHERE user_id = ?",
    [userId],
  );
  return new Set(rows.map((row) => Number(row.product_id)));
}

export async function getUserPoints(userId: number): Promise<number> {
  const [rows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT IFNULL(points, 0) AS points FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  return rows.length ? Number(rows[0].points || 0) : 0;
}

async function fetchCartProduct(
  connection: PoolConnection | typeof mainDb,
  productId: number,
): Promise<StoreProduct | null> {
  const [rows] = await connection.execute<ProductRow[]>(
    `
      SELECT
        id,
        name,
        slug,
        IFNULL(license_key, '') AS license_key,
        description,
        extra_info,
        changelog_text,
        version_label,
        price,
        is_free,
        IFNULL(point_price, 0) AS point_price,
        IFNULL(stock_quantity, 0) AS stock_quantity,
        IFNULL(category, 'all') AS category,
        image_url,
        review_video_url,
        download_url,
        file_path,
        is_active
      FROM products
      WHERE id = ? AND is_active = 1
      LIMIT 1
    `,
    [productId],
  );

  if (!rows.length) {
    return null;
  }
  return normalizeProduct(rows[0]);
}

export async function sanitizeCartForUser(
  userId: number,
  rawCart: Record<string, number>,
): Promise<{
  cleanedCart: Record<string, number>;
  items: CartItem[];
  totalPoints: number;
}> {
  const cleanedCart: Record<string, number> = {};
  const items: CartItem[] = [];
  let totalPoints = 0;

  const owned = await getOwnedProductIds(userId);
  for (const [key, value] of Object.entries(rawCart)) {
    const productId = Number.parseInt(key, 10);
    const qty = Number.parseInt(String(value), 10);
    if (!Number.isInteger(productId) || productId <= 0) {
      continue;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      continue;
    }
    if (owned.has(productId)) {
      continue;
    }

    const product = await fetchCartProduct(mainDb, productId);
    if (!product) {
      continue;
    }
    if (product.stockQuantity <= 0) {
      continue;
    }

    // Each user can only own one copy per product (user_products has unique user_id+product_id).
    const finalQty = Math.min(qty, product.stockQuantity, 1);
    const linePoints = product.pointPrice * finalQty;
    cleanedCart[String(productId)] = finalQty;
    totalPoints += linePoints;
    items.push({
      productId,
      name: product.name,
      qty: finalQty,
      pointPrice: product.pointPrice,
      linePoints,
      stockQuantity: product.stockQuantity,
    });
  }

  return { cleanedCart, items, totalPoints };
}

export async function addToCart(userId: number, cart: Record<string, number>, productId: number): Promise<{
  cart: Record<string, number>;
  error?: string;
}> {
  if (!Number.isInteger(productId) || productId <= 0) {
    return { cart, error: "product" };
  }

  const product = await fetchCartProduct(mainDb, productId);
  if (!product) {
    return { cart, error: "product" };
  }
  if (product.stockQuantity <= 0) {
    return { cart, error: "out_of_stock" };
  }

  const [ownedRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT 1 FROM user_products WHERE user_id = ? AND product_id = ? LIMIT 1",
    [userId, productId],
  );
  if (ownedRows.length > 0) {
    return { cart, error: "owned" };
  }

  const next = { ...cart };
  const currentQty = Number(next[String(productId)] || 0);
  if (currentQty >= 1) {
    next[String(productId)] = 1;
    return { cart: next };
  }
  if (currentQty + 1 > product.stockQuantity) {
    return { cart, error: "stock_limit" };
  }
  next[String(productId)] = currentQty + 1;
  return { cart: next };
}

export function removeFromCart(cart: Record<string, number>, productId: number): Record<string, number> {
  const next = { ...cart };
  delete next[String(productId)];
  return next;
}

export async function checkoutCart(userId: number, cart: Record<string, number>): Promise<{
  productNames: string[];
}> {
  const connection = await mainDb.getConnection();
  const assignedProducts = new Set<number>();
  const checkoutLockName = `checkout_user_${userId}`;
  let lockAcquired = false;
  let txStarted = false;
  try {
    const [lockRows] = await connection.execute<(RowDataPacket & { locked: number | null })[]>(
      "SELECT GET_LOCK(?, 10) AS locked",
      [checkoutLockName],
    );
    if (Number(lockRows[0]?.locked || 0) !== 1) {
      throw new Error("checkout_busy");
    }
    lockAcquired = true;

    await connection.beginTransaction();
    txStarted = true;

    const checkoutItems: CheckoutItem[] = [];
    let totalPoints = 0;

    for (const [key, value] of Object.entries(cart)) {
      const productId = Number.parseInt(key, 10);
      const qty = Number.parseInt(String(value), 10);
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(qty) || qty <= 0) {
        continue;
      }
      const finalQty = Math.min(qty, 1);
      if (finalQty <= 0) {
        continue;
      }

      const [productRows] = await connection.execute<ProductRow[]>(
        `
          SELECT
            id,
            name,
            slug,
            IFNULL(license_key, '') AS license_key,
            description,
            extra_info,
            changelog_text,
            version_label,
            price,
            is_free,
            IFNULL(point_price, 0) AS point_price,
            IFNULL(stock_quantity, 0) AS stock_quantity,
            IFNULL(category, 'all') AS category,
            image_url,
            review_video_url,
            download_url,
            file_path,
            is_active
          FROM products
          WHERE id = ? AND is_active = 1
          FOR UPDATE
        `,
        [productId],
      );
      if (!productRows.length) {
        continue;
      }
      const product = normalizeProduct(productRows[0]);

      const [ownedRows] = await connection.execute<RowDataPacket[]>(
        "SELECT 1 FROM user_products WHERE user_id = ? AND product_id = ? LIMIT 1",
        [userId, productId],
      );
      if (ownedRows.length) {
        continue;
      }

      if (product.stockQuantity <= 0 || finalQty > product.stockQuantity) {
        throw new Error("stock");
      }

      totalPoints += product.pointPrice * finalQty;
      checkoutItems.push({
        productId,
        name: product.name,
        qty: finalQty,
        pointPrice: product.pointPrice,
        price: product.price,
        isFree: product.isFree,
        stockQuantity: product.stockQuantity,
      });
    }

    if (!checkoutItems.length) {
      throw new Error("cart_empty");
    }

    if (totalPoints > 0) {
      const [pointRows] = await connection.execute<RowDataPacket[]>(
        "SELECT IFNULL(points, 0) AS points FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      const userPoints = pointRows.length ? Number(pointRows[0].points || 0) : 0;
      if (userPoints < totalPoints) {
        throw new Error("points");
      }
      await connection.execute("UPDATE users SET points = points - ? WHERE id = ?", [
        totalPoints,
        userId,
      ]);
    }

    for (const item of checkoutItems) {
      const [stockResult] = await connection.execute<ResultSetHeader>(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?",
        [item.qty, item.productId, item.qty],
      );
      if (stockResult.affectedRows !== 1) {
        throw new Error("stock");
      }

      const [ownershipInsert] = await connection.execute<ResultSetHeader>(
        "INSERT IGNORE INTO user_products (user_id, product_id, redemption_id) VALUES (?, ?, NULL)",
        [userId, item.productId],
      );
      if (ownershipInsert.affectedRows !== 1) {
        throw new Error("owned");
      }

      await connection.execute(
        "INSERT INTO orders (user_id, product_id, amount, status) VALUES (?, ?, ?, 'pending')",
        [userId, item.productId, item.isFree ? 0 : item.price],
      );
      assignedProducts.add(item.productId);
    }

    await connection.commit();

    for (const productId of assignedProducts) {
      try {
        await assignProductLicense(userId, productId);
      } catch {
        // Keep checkout flow successful even when license sync fails.
      }
    }

    return { productNames: checkoutItems.map((item) => item.name) };
  } catch (error) {
    if (txStarted) {
      await connection.rollback().catch(() => {});
    }
    throw error;
  } finally {
    if (lockAcquired) {
      await connection.execute("SELECT RELEASE_LOCK(?)", [checkoutLockName]).catch(() => {});
    }
    connection.release();
  }
}

export async function redeemCode(userId: number, codeInput: string, ipAddress?: string): Promise<string> {
  const code = codeInput.trim();
  if (!code) {
    throw new Error("Please provide redeem code.");
  }

  const connection = await mainDb.getConnection();
  try {
    await connection.beginTransaction();

    let keyRow: (RowDataPacket & {
      id: number;
      key_type?: string;
      product_id?: number | null;
      point_amount?: number | null;
      max_uses: number;
      used_count: number;
      expires_at?: string | null;
      is_active: number;
      product_name?: string | null;
    }) | null = null;

    try {
      const [rows] = await connection.execute<
        (RowDataPacket & {
          id: number;
          key_type: string;
          product_id: number | null;
          point_amount: number;
          max_uses: number;
          used_count: number;
          expires_at: string | null;
          is_active: number;
          product_name: string | null;
        })[]
      >(
        `
          SELECT
            lk.id,
            lk.key_type,
            lk.product_id,
            lk.point_amount,
            lk.max_uses,
            lk.used_count,
            lk.expires_at,
            lk.is_active,
            p.name AS product_name
          FROM license_keys lk
          LEFT JOIN products p ON p.id = lk.product_id AND p.is_active = 1
          WHERE lk.code = ? AND lk.is_active = 1
          LIMIT 1
        `,
        [code],
      );
      keyRow = rows.length ? rows[0] : null;
    } catch {
      const [rows] = await connection.execute<
        (RowDataPacket & {
          id: number;
          product_id: number | null;
          max_uses: number;
          used_count: number;
          expires_at: string | null;
          is_active: number;
          product_name: string | null;
        })[]
      >(
        `
          SELECT
            lk.id,
            lk.product_id,
            lk.max_uses,
            lk.used_count,
            lk.expires_at,
            lk.is_active,
            p.name AS product_name
          FROM license_keys lk
          LEFT JOIN products p ON p.id = lk.product_id AND p.is_active = 1
          WHERE lk.code = ? AND lk.is_active = 1
          LIMIT 1
        `,
        [code],
      );
      keyRow = rows.length ? { ...rows[0], key_type: "product", point_amount: 0 } : null;
    }

    if (!keyRow) {
      throw new Error("Invalid or expired code.");
    }
    if (Number(keyRow.used_count || 0) >= Number(keyRow.max_uses || 0)) {
      throw new Error("Code usage limit reached.");
    }
    if (keyRow.expires_at) {
      const expires = new Date(keyRow.expires_at);
      if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
        throw new Error("Code has expired.");
      }
    }

    const keyType = String(keyRow.key_type || "product");
    if (keyType === "points") {
      const pointAmount = Number(keyRow.point_amount || 0);
      if (pointAmount <= 0) {
        throw new Error("Invalid points code.");
      }

      await connection.execute("UPDATE license_keys SET used_count = used_count + 1 WHERE id = ?", [
        keyRow.id,
      ]);
      await connection.execute("UPDATE users SET points = IFNULL(points, 0) + ? WHERE id = ?", [
        pointAmount,
        userId,
      ]);
      await connection.commit();
      return `Redeemed successfully. Added ${pointAmount.toLocaleString()} points.`;
    }

    const productId = Number(keyRow.product_id || 0);
    const productName = String(keyRow.product_name || "");
    if (!productId || !productName) {
      throw new Error("Invalid product code.");
    }

    const [ownedRows] = await connection.execute<RowDataPacket[]>(
      "SELECT 1 FROM user_products WHERE user_id = ? AND product_id = ? LIMIT 1",
      [userId, productId],
    );
    if (ownedRows.length) {
      throw new Error("You already own this product.");
    }

    const [redemptionResult] = await connection.execute<ResultSetHeader>(
      "INSERT INTO redemptions (user_id, license_key_id, product_id, ip_address) VALUES (?, ?, ?, ?)",
      [userId, keyRow.id, productId, ipAddress || null],
    );

    await connection.execute("UPDATE license_keys SET used_count = used_count + 1 WHERE id = ?", [
      keyRow.id,
    ]);
    await connection.execute(
      "INSERT INTO user_products (user_id, product_id, redemption_id) VALUES (?, ?, ?)",
      [userId, productId, Number(redemptionResult.insertId)],
    );

    await connection.commit();

    try {
      await assignProductLicense(userId, productId);
    } catch {
      // Do not fail redeem flow if license sync fails.
    }

    return `Redeemed successfully: ${productName}`;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function resolveDownloadFile(userId: number, productId: number): Promise<{
  filePath: string;
  downloadName: string;
}> {
  const [rows] = await mainDb.execute<
    (RowDataPacket & { file_path: string | null; name: string | null })[]
  >(
    `
      SELECT p.file_path, p.name
      FROM user_products up
      JOIN products p ON p.id = up.product_id
      WHERE up.user_id = ? AND up.product_id = ?
      LIMIT 1
    `,
    [userId, productId],
  );

  if (!rows.length) {
    throw new Error("not_found");
  }
  const row = rows[0];
  const relativeFilePath = String(row.file_path || "").trim();
  if (!relativeFilePath) {
    throw new Error("not_found");
  }

  const absolutePath = path.resolve(env.projectRoot, relativeFilePath);
  if (!absolutePath.startsWith(env.projectRoot)) {
    throw new Error("not_found");
  }

  const safeBaseName = String(row.name || `product_${productId}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
  return { filePath: absolutePath, downloadName: `${safeBaseName}_${productId}.zip` };
}
