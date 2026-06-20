import { randomBytes } from "crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { mainDb } from "@/lib/db";

export type AdminStats = {
  productsCount: number;
  keysCount: number;
  ordersPending: number;
};

export type AnalyticsPeriod = "day" | "month" | "year";

export type AnalyticsPoint = {
  key: string;
  label: string;
  sales: number;
  profit: number;
  orders: number;
};

export type AnalyticsCategory = {
  name: string;
  sales: number;
  profit: number;
  orders: number;
};

export type PeriodAnalytics = {
  points: AnalyticsPoint[];
  categories: AnalyticsCategory[];
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
};

export type AdminSalesAnalytics = {
  day: PeriodAnalytics;
  month: PeriodAnalytics;
  year: PeriodAnalytics;
  profitNote: string;
};

export type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  licenseKey: string;
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
  createdAt: string;
};

type KeyRow = RowDataPacket & {
  id: number;
  code: string;
  key_type: string | null;
  point_amount: number | null;
  max_uses: number;
  used_count: number;
  is_active: number;
  created_at: string;
  product_name: string | null;
};

export type AdminKey = {
  id: number;
  code: string;
  keyType: "product" | "points";
  pointAmount: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  productName: string;
};

export type AdminOrder = {
  id: number;
  amount: number;
  status: string;
  adminNote: string;
  createdAt: string;
  username: string;
  email: string;
  productName: string;
};

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  points: number;
  role: string;
};

type SalesPointRow = RowDataPacket & {
  bucket: string | number;
  sales: number | string | null;
  orders: number | string | null;
};

type CategorySalesRow = RowDataPacket & {
  category: string | null;
  sales: number | string | null;
  orders: number | string | null;
};

function toProduct(row: RowDataPacket): AdminProduct {
  return {
    id: Number(row.id),
    name: String(row.name || ""),
    slug: String(row.slug || ""),
    licenseKey: String(row.license_key || ""),
    description: String(row.description || ""),
    extraInfo: String(row.extra_info || ""),
    changelogText: String(row.changelog_text || ""),
    versionLabel: String(row.version_label || ""),
    price: Number(row.price || 0),
    isFree: Number(row.is_free || 0) === 1,
    pointPrice: Number(row.point_price || 0),
    stockQuantity: Number(row.stock_quantity || 0),
    category: String(row.category || "all"),
    imageUrl: String(row.image_url || ""),
    reviewVideoUrl: String(row.review_video_url || ""),
    downloadUrl: String(row.download_url || ""),
    filePath: String(row.file_path || ""),
    isActive: Number(row.is_active || 0) === 1,
    createdAt: String(row.created_at || ""),
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  const [productRows] = await mainDb.execute<RowDataPacket[]>("SELECT COUNT(*) AS total FROM products");
  const [keyRows] = await mainDb.execute<RowDataPacket[]>("SELECT COUNT(*) AS total FROM license_keys");
  const [orderRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM orders WHERE status = 'pending'",
  );
  return {
    productsCount: Number(productRows[0]?.total || 0),
    keysCount: Number(keyRows[0]?.total || 0),
    ordersPending: Number(orderRows[0]?.total || 0),
  };
}

function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthShortLabel(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
}

function toMoney(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toInt(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

async function getCategorySlices(startDate: string): Promise<AnalyticsCategory[]> {
  const [rows] = await mainDb.execute<CategorySalesRow[]>(
    `
      SELECT
        IFNULL(NULLIF(p.category, ''), 'uncategorized') AS category,
        SUM(IF(o.status = 'paid', o.amount, 0)) AS sales,
        SUM(IF(o.status = 'paid', 1, 0)) AS orders
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.created_at >= ?
      GROUP BY IFNULL(NULLIF(p.category, ''), 'uncategorized')
      HAVING SUM(IF(o.status = 'paid', o.amount, 0)) > 0
      ORDER BY sales DESC
    `,
    [startDate],
  );

  if (!rows.length) {
    return [];
  }

  const maxSlices = 6;
  const top = rows.slice(0, maxSlices).map((row) => {
    const sales = toMoney(row.sales);
    return {
      name: String(row.category || "uncategorized"),
      sales,
      profit: sales,
      orders: toInt(row.orders),
    };
  });

  if (rows.length <= maxSlices) {
    return top;
  }

  const otherRows = rows.slice(maxSlices);
  const other = otherRows.reduce(
    (acc, row) => {
      const sales = toMoney(row.sales);
      return {
        sales: acc.sales + sales,
        profit: acc.profit + sales,
        orders: acc.orders + toInt(row.orders),
      };
    },
    { sales: 0, profit: 0, orders: 0 },
  );

  if (other.sales > 0) {
    top.push({
      name: "other",
      sales: other.sales,
      profit: other.profit,
      orders: other.orders,
    });
  }

  return top;
}

async function getDailyAnalytics(): Promise<PeriodAnalytics> {
  const [rows] = await mainDb.execute<SalesPointRow[]>(
    `
      SELECT
        DATE_FORMAT(o.created_at, '%Y-%m-%d') AS bucket,
        SUM(IF(o.status = 'paid', o.amount, 0)) AS sales,
        SUM(IF(o.status = 'paid', 1, 0)) AS orders
      FROM orders o
      WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
      ORDER BY bucket ASC
    `,
  );

  const map = new Map(
    rows.map((row) => [
      String(row.bucket),
      { sales: toMoney(row.sales), orders: toInt(row.orders) },
    ]),
  );

  const points: AnalyticsPoint[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = formatDayKey(date);
    const data = map.get(key) || { sales: 0, orders: 0 };
    points.push({
      key,
      label: `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`,
      sales: data.sales,
      profit: data.sales,
      orders: data.orders,
    });
  }

  const totalSales = points.reduce((sum, point) => sum + point.sales, 0);
  const totalOrders = points.reduce((sum, point) => sum + point.orders, 0);
  const categories = await getCategorySlices(formatDayKey(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)));
  return {
    points,
    categories,
    totalSales,
    totalProfit: totalSales,
    totalOrders,
  };
}

async function getMonthlyAnalytics(): Promise<PeriodAnalytics> {
  const [rows] = await mainDb.execute<SalesPointRow[]>(
    `
      SELECT
        DATE_FORMAT(o.created_at, '%Y-%m') AS bucket,
        SUM(IF(o.status = 'paid', o.amount, 0)) AS sales,
        SUM(IF(o.status = 'paid', 1, 0)) AS orders
      FROM orders o
      WHERE o.created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
      GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
      ORDER BY bucket ASC
    `,
  );

  const map = new Map(
    rows.map((row) => [
      String(row.bucket),
      { sales: toMoney(row.sales), orders: toInt(row.orders) },
    ]),
  );

  const points: AnalyticsPoint[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(1);
    date.setMonth(date.getMonth() - i);
    const key = formatMonthKey(date);
    const data = map.get(key) || { sales: 0, orders: 0 };
    points.push({
      key,
      label: monthShortLabel(date),
      sales: data.sales,
      profit: data.sales,
      orders: data.orders,
    });
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(1);
  start.setMonth(start.getMonth() - 11);
  const totalSales = points.reduce((sum, point) => sum + point.sales, 0);
  const totalOrders = points.reduce((sum, point) => sum + point.orders, 0);
  const categories = await getCategorySlices(`${formatDayKey(start)} 00:00:00`);
  return {
    points,
    categories,
    totalSales,
    totalProfit: totalSales,
    totalOrders,
  };
}

async function getYearlyAnalytics(): Promise<PeriodAnalytics> {
  const [rows] = await mainDb.execute<SalesPointRow[]>(
    `
      SELECT
        YEAR(o.created_at) AS bucket,
        SUM(IF(o.status = 'paid', o.amount, 0)) AS sales,
        SUM(IF(o.status = 'paid', 1, 0)) AS orders
      FROM orders o
      WHERE o.created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 YEAR), '%Y-01-01')
      GROUP BY YEAR(o.created_at)
      ORDER BY bucket ASC
    `,
  );

  const map = new Map(
    rows.map((row) => [
      String(row.bucket),
      { sales: toMoney(row.sales), orders: toInt(row.orders) },
    ]),
  );

  const currentYear = new Date().getFullYear();
  const points: AnalyticsPoint[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const year = currentYear - i;
    const key = String(year);
    const data = map.get(key) || { sales: 0, orders: 0 };
    points.push({
      key,
      label: key,
      sales: data.sales,
      profit: data.sales,
      orders: data.orders,
    });
  }

  const totalSales = points.reduce((sum, point) => sum + point.sales, 0);
  const totalOrders = points.reduce((sum, point) => sum + point.orders, 0);
  const categories = await getCategorySlices(`${currentYear - 5}-01-01 00:00:00`);
  return {
    points,
    categories,
    totalSales,
    totalProfit: totalSales,
    totalOrders,
  };
}

export async function getAdminSalesAnalytics(): Promise<AdminSalesAnalytics> {
  const [day, month, year] = await Promise.all([
    getDailyAnalytics(),
    getMonthlyAnalytics(),
    getYearlyAnalytics(),
  ]);

  return {
    day,
    month,
    year,
    profitNote: "Profit currently follows paid sales because product cost is not configured in the database.",
  };
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const [rows] = await mainDb.execute<RowDataPacket[]>(
    `
      SELECT
        id,
        name,
        slug,
        IFNULL(license_key, '') AS license_key,
        IFNULL(description, '') AS description,
        IFNULL(extra_info, '') AS extra_info,
        IFNULL(changelog_text, '') AS changelog_text,
        IFNULL(version_label, '') AS version_label,
        IFNULL(price, 0) AS price,
        IFNULL(is_free, 0) AS is_free,
        IFNULL(point_price, 0) AS point_price,
        IFNULL(stock_quantity, 0) AS stock_quantity,
        IFNULL(category, 'all') AS category,
        IFNULL(image_url, '') AS image_url,
        IFNULL(review_video_url, '') AS review_video_url,
        IFNULL(download_url, '') AS download_url,
        IFNULL(file_path, '') AS file_path,
        IFNULL(is_active, 1) AS is_active,
        created_at
      FROM products
      ORDER BY created_at DESC, id DESC
    `,
  );
  return rows.map(toProduct);
}

export async function getAdminProductById(productId: number): Promise<AdminProduct | null> {
  const [rows] = await mainDb.execute<RowDataPacket[]>(
    `
      SELECT
        id,
        name,
        slug,
        IFNULL(license_key, '') AS license_key,
        IFNULL(description, '') AS description,
        IFNULL(extra_info, '') AS extra_info,
        IFNULL(changelog_text, '') AS changelog_text,
        IFNULL(version_label, '') AS version_label,
        IFNULL(price, 0) AS price,
        IFNULL(is_free, 0) AS is_free,
        IFNULL(point_price, 0) AS point_price,
        IFNULL(stock_quantity, 0) AS stock_quantity,
        IFNULL(category, 'all') AS category,
        IFNULL(image_url, '') AS image_url,
        IFNULL(review_video_url, '') AS review_video_url,
        IFNULL(download_url, '') AS download_url,
        IFNULL(file_path, '') AS file_path,
        IFNULL(is_active, 1) AS is_active,
        created_at
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [productId],
  );
  if (!rows.length) {
    return null;
  }
  return toProduct(rows[0]);
}

function sanitizeSlug(slug: string): string {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return normalized.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function validateLicenseKey(value: string): boolean {
  return /^[A-Z0-9._-]{6,255}$/.test(value);
}

export type ProductInput = {
  name: string;
  slug: string;
  licenseKey: string;
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
};

function normalizeProductInput(input: ProductInput): ProductInput {
  const slug = sanitizeSlug(input.slug.trim());
  const licenseKey = input.licenseKey.trim().toUpperCase();
  return {
    ...input,
    name: input.name.trim(),
    slug,
    licenseKey,
    description: input.description.trim(),
    extraInfo: input.extraInfo.trim(),
    changelogText: input.changelogText.trim(),
    versionLabel: input.versionLabel.trim(),
    category: input.category.trim() || "all",
    imageUrl: input.imageUrl.trim(),
    reviewVideoUrl: input.reviewVideoUrl.trim(),
    downloadUrl: input.downloadUrl.trim(),
    filePath: input.filePath.trim(),
    price: Number.isFinite(input.price) ? input.price : 0,
    pointPrice: Number.isFinite(input.pointPrice) ? Math.max(0, Math.floor(input.pointPrice)) : 0,
    stockQuantity: Number.isFinite(input.stockQuantity) ? Math.max(0, Math.floor(input.stockQuantity)) : 0,
    isFree: Boolean(input.isFree),
    isActive: Boolean(input.isActive),
  };
}

function assertProductInput(input: ProductInput): void {
  if (!input.name) {
    throw new Error("Please provide product name.");
  }
  if (!input.slug) {
    throw new Error("Please provide slug.");
  }
  if (!input.licenseKey) {
    throw new Error("Please provide license key.");
  }
  if (!validateLicenseKey(input.licenseKey)) {
    throw new Error("License key format is invalid.");
  }
}

export async function createAdminProduct(rawInput: ProductInput): Promise<number> {
  const input = normalizeProductInput(rawInput);
  assertProductInput(input);

  const [slugRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT id FROM products WHERE slug = ? LIMIT 1",
    [input.slug],
  );
  if (slugRows.length) {
    throw new Error("This slug already exists.");
  }

  const [licenseRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT id FROM products WHERE license_key = ? LIMIT 1",
    [input.licenseKey],
  );
  if (licenseRows.length) {
    throw new Error("This license key already exists.");
  }

  const [result] = await mainDb.execute<ResultSetHeader>(
    `
      INSERT INTO products (
        name,
        slug,
        license_key,
        description,
        extra_info,
        changelog_text,
        version_label,
        price,
        is_free,
        point_price,
        stock_quantity,
        category,
        image_url,
        review_video_url,
        download_url,
        file_path,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.name,
      input.slug,
      input.licenseKey,
      input.description || null,
      input.extraInfo || null,
      input.changelogText || null,
      input.versionLabel || null,
      input.price,
      input.isFree ? 1 : 0,
      input.pointPrice,
      input.stockQuantity,
      input.category,
      input.imageUrl || null,
      input.reviewVideoUrl || null,
      input.downloadUrl || null,
      input.filePath || null,
      input.isActive ? 1 : 0,
    ],
  );
  return Number(result.insertId);
}

export async function updateAdminProduct(productId: number, rawInput: ProductInput): Promise<void> {
  const input = normalizeProductInput(rawInput);
  assertProductInput(input);

  const [slugRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT id FROM products WHERE slug = ? AND id <> ? LIMIT 1",
    [input.slug, productId],
  );
  if (slugRows.length) {
    throw new Error("This slug already exists.");
  }

  const [licenseRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT id FROM products WHERE license_key = ? AND id <> ? LIMIT 1",
    [input.licenseKey, productId],
  );
  if (licenseRows.length) {
    throw new Error("This license key already exists on another product.");
  }

  await mainDb.execute(
    `
      UPDATE products
      SET
        name = ?,
        slug = ?,
        license_key = ?,
        description = ?,
        extra_info = ?,
        changelog_text = ?,
        version_label = ?,
        price = ?,
        is_free = ?,
        point_price = ?,
        stock_quantity = ?,
        category = ?,
        image_url = ?,
        review_video_url = ?,
        download_url = ?,
        file_path = ?,
        is_active = ?
      WHERE id = ?
    `,
    [
      input.name,
      input.slug,
      input.licenseKey,
      input.description || null,
      input.extraInfo || null,
      input.changelogText || null,
      input.versionLabel || null,
      input.price,
      input.isFree ? 1 : 0,
      input.pointPrice,
      input.stockQuantity,
      input.category,
      input.imageUrl || null,
      input.reviewVideoUrl || null,
      input.downloadUrl || null,
      input.filePath || null,
      input.isActive ? 1 : 0,
      productId,
    ],
  );
}

export async function deleteAdminProduct(productId: number): Promise<void> {
  await mainDb.execute("DELETE FROM products WHERE id = ?", [productId]);
}

export async function listAdminKeys(limit = 500): Promise<AdminKey[]> {
  const [rows] = await mainDb.execute<KeyRow[]>(
    `
      SELECT
        lk.id,
        lk.code,
        lk.key_type,
        lk.point_amount,
        lk.max_uses,
        lk.used_count,
        lk.is_active,
        lk.created_at,
        p.name AS product_name
      FROM license_keys lk
      LEFT JOIN products p ON p.id = lk.product_id
      ORDER BY lk.created_at DESC
      LIMIT ?
    `,
    [Math.max(1, Math.min(5000, limit))],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    code: String(row.code || ""),
    keyType: String(row.key_type || "product") === "points" ? "points" : "product",
    pointAmount: Number(row.point_amount || 0),
    maxUses: Number(row.max_uses || 0),
    usedCount: Number(row.used_count || 0),
    isActive: Number(row.is_active || 0) === 1,
    createdAt: String(row.created_at || ""),
    productName: String(row.product_name || ""),
  }));
}

function generateKeyCode(): string {
  const first = randomBytes(4).toString("hex").toUpperCase();
  const second = randomBytes(4).toString("hex").toUpperCase();
  const third = randomBytes(4).toString("hex").toUpperCase();
  return `${first}-${second}-${third}`;
}

export async function createAdminKeys(input: {
  keyType: "product" | "points";
  productId: number | null;
  pointAmount: number;
  maxUses: number;
  count: number;
}): Promise<string[]> {
  const count = Math.max(1, Math.min(100, Math.floor(input.count)));
  const maxUses = Math.max(1, Math.floor(input.maxUses || 1));
  const pointAmount = Math.max(0, Math.floor(input.pointAmount || 0));
  const keyType = input.keyType === "points" ? "points" : "product";

  if (keyType === "product") {
    const productId = Number(input.productId || 0);
    if (!productId) {
      throw new Error("Please choose product.");
    }
    const [rows] = await mainDb.execute<RowDataPacket[]>(
      "SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
      [productId],
    );
    if (!rows.length) {
      throw new Error("Please choose product.");
    }
  } else if (pointAmount <= 0) {
    throw new Error("Please provide points greater than 0.");
  }

  const created: string[] = [];
  const insertSql =
    "INSERT INTO license_keys (key_type, product_id, point_amount, code, max_uses) VALUES (?, ?, ?, ?, ?)";

  for (let i = 0; i < count; i += 1) {
    let tries = 0;
    while (tries < 20) {
      const code = generateKeyCode();
      try {
        await mainDb.execute(insertSql, [
          keyType,
          keyType === "product" ? input.productId : null,
          keyType === "points" ? pointAmount : 0,
          code,
          maxUses,
        ]);
        created.push(code);
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("duplicate")) {
          throw error;
        }
      }
      tries += 1;
    }
  }

  return created;
}

export async function deleteAdminKey(keyId: number): Promise<void> {
  await mainDb.execute("DELETE FROM license_keys WHERE id = ?", [keyId]);
}

export async function listAdminOrders(limit = 200): Promise<AdminOrder[]> {
  const [rows] = await mainDb.execute<RowDataPacket[]>(
    `
      SELECT
        o.id,
        o.amount,
        o.status,
        o.admin_note,
        o.created_at,
        u.username,
        u.email,
        p.name AS product_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN products p ON p.id = o.product_id
      ORDER BY o.created_at DESC
      LIMIT ?
    `,
    [Math.max(1, Math.min(1000, limit))],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    amount: Number(row.amount || 0),
    status: String(row.status || ""),
    adminNote: String(row.admin_note || ""),
    createdAt: String(row.created_at || ""),
    username: String(row.username || ""),
    email: String(row.email || ""),
    productName: String(row.product_name || ""),
  }));
}

export async function markOrderPaid(orderId: number, note: string): Promise<void> {
  await mainDb.execute("UPDATE orders SET status = 'paid', admin_note = ? WHERE id = ?", [
    note.trim() || null,
    orderId,
  ]);
}

export async function addPointsByEmail(emailInput: string, pointsInput: number): Promise<{
  userId: number;
  username: string;
  pointsAdded: number;
}> {
  const email = emailInput.trim().toLowerCase();
  const points = Math.max(1, Math.floor(pointsInput));
  if (!email) {
    throw new Error("Please provide user email.");
  }

  const [rows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT id, username FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  if (!rows.length) {
    throw new Error("User email not found.");
  }

  const userId = Number(rows[0].id);
  const username = String(rows[0].username || "");

  await mainDb.execute("UPDATE users SET points = IFNULL(points, 0) + ? WHERE id = ?", [
    points,
    userId,
  ]);

  return { userId, username, pointsAdded: points };
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const [rows] = await mainDb.execute<RowDataPacket[]>(
    `
      SELECT
        id,
        email,
        username,
        IFNULL(points, 0) AS points,
        IFNULL(role, 'member') AS role
      FROM users
      ORDER BY id ASC
    `,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    email: String(row.email || ""),
    username: String(row.username || ""),
    points: Number(row.points || 0),
    role: String(row.role || "member"),
  }));
}

export async function setAdminUserRole(userId: number, role: "member" | "admin"): Promise<void> {
  await mainDb.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
}
