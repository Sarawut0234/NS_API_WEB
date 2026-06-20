import { mainDb } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type CountRow = RowDataPacket & { total: number };

export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowSeconds = 900,
): Promise<boolean> {
  if (!identifier.trim() || !action.trim() || maxAttempts <= 0) {
    return false;
  }

  await mainDb.execute(
    `
      DELETE FROM rate_limit
      WHERE action = ? AND created_at < DATE_SUB(NOW(), INTERVAL ? SECOND)
    `,
    [action, windowSeconds],
  );

  const [rows] = await mainDb.execute<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM rate_limit
      WHERE identifier = ?
        AND action = ?
        AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
    `,
    [identifier, action, windowSeconds],
  );

  const used = Number(rows[0]?.total || 0);
  if (used >= maxAttempts) {
    return false;
  }

  await mainDb.execute("INSERT INTO rate_limit (identifier, action) VALUES (?, ?)", [
    identifier,
    action,
  ]);
  return true;
}
