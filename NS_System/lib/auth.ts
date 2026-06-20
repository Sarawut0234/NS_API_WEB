import { randomBytes } from "crypto";

import { compare, hash } from "bcryptjs";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { NextRequest } from "next/server";

import { mainDb } from "@/lib/db";
import { env } from "@/lib/env";
import { getUserIdFromRequest } from "@/lib/session";

export type AppUser = {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  points: number;
  role: string;
};

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  discriminator: string | null;
  points: number | null;
  role: string | null;
};

type LoginRow = RowDataPacket & {
  id: number;
  email: string;
  username: string;
  password: string;
  avatar: string | null;
  discriminator: string | null;
  points: number | null;
  role: string | null;
};

type DiscordUserInput = {
  id: string;
  email?: string;
  username?: string;
  global_name?: string;
  discriminator?: string;
  avatar?: string | null;
};

function normalizeUser(row: UserRow): AppUser {
  return {
    id: Number(row.id),
    email: String(row.email || ""),
    username: String(row.username || ""),
    avatar: row.avatar ? String(row.avatar) : null,
    discriminator: String(row.discriminator || "0"),
    points: Number(row.points || 0),
    role: String(row.role || "member"),
  };
}

async function fetchUserById(userId: number, connection?: PoolConnection): Promise<AppUser | null> {
  const db = connection || mainDb;
  const [rows] = await db.execute<UserRow[]>(
    `
      SELECT
        id,
        email,
        username,
        avatar,
        IFNULL(discriminator, '0') AS discriminator,
        IFNULL(points, 0) AS points,
        IFNULL(role, 'member') AS role
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId],
  );

  if (rows.length === 0) {
    return null;
  }
  return normalizeUser(rows[0]);
}

export function isAdminEmail(email: string): boolean {
  return env.adminEmails.includes(email.trim().toLowerCase());
}

export function isAdminUser(user: Pick<AppUser, "email" | "role">): boolean {
  if (user.role === "admin") {
    return true;
  }
  return isAdminEmail(user.email);
}

export async function getCurrentUser(request: NextRequest): Promise<AppUser | null> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return null;
  }
  return fetchUserById(userId);
}

export async function registerPasswordUser(input: {
  email: string;
  username: string;
  password: string;
}): Promise<AppUser> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const password = input.password;

  if (!email || !username || !password) {
    throw new Error("Please provide email, username, and password.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  if (username.length < 2 || username.length > 50) {
    throw new Error("Username must be between 2 and 50 characters.");
  }

  const [emailRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  if (emailRows.length > 0) {
    throw new Error("Email is already in use.");
  }

  const [usernameRows] = await mainDb.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE username = ? LIMIT 1",
    [username],
  );
  if (usernameRows.length > 0) {
    throw new Error("Username is already in use.");
  }

  const passwordHash = await hash(password, 12);
  const [result] = await mainDb.execute<ResultSetHeader>(
    "INSERT INTO users (email, username, password) VALUES (?, ?, ?)",
    [email, username, passwordHash],
  );

  const user = await fetchUserById(Number(result.insertId));
  if (!user) {
    throw new Error("Unable to create user.");
  }
  return user;
}

export async function loginPasswordUser(input: {
  email: string;
  password: string;
}): Promise<AppUser> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  const [rows] = await mainDb.execute<LoginRow[]>(
    `
      SELECT
        id,
        email,
        username,
        password,
        avatar,
        IFNULL(discriminator, '0') AS discriminator,
        IFNULL(points, 0) AS points,
        IFNULL(role, 'member') AS role
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  if (!rows.length) {
    throw new Error("Email or password is incorrect.");
  }

  const row = rows[0];
  const ok = await compare(password, String(row.password || ""));
  if (!ok) {
    throw new Error("Email or password is incorrect.");
  }

  await mainDb.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [row.id]);

  return {
    id: Number(row.id),
    email: String(row.email || ""),
    username: String(row.username || ""),
    avatar: row.avatar ? String(row.avatar) : null,
    discriminator: String(row.discriminator || "0"),
    points: Number(row.points || 0),
    role: String(row.role || "member"),
  };
}

function discordAvatarUrl(discordId: string, avatarHash?: string | null): string | null {
  const id = discordId.trim();
  const hashValue = (avatarHash || "").trim();
  if (!id || !hashValue) {
    return null;
  }
  const ext = hashValue.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${encodeURIComponent(hashValue)}.${ext}`;
}

function usernameFromDiscord(discordUser: DiscordUserInput): string {
  const display =
    discordUser.global_name?.trim() ||
    discordUser.username?.trim() ||
    (discordUser.id ? `discord_${discordUser.id.trim()}` : "discord_user");
  const sliced = display.slice(0, 50).trim();
  return sliced || "discord_user";
}

async function uniqueUsername(
  connection: PoolConnection,
  baseUsername: string,
  excludeUserId?: number,
): Promise<string> {
  const base = (baseUsername.trim() || "discord_user").slice(0, 50);
  let index = 0;
  while (true) {
    const suffix = index === 0 ? "" : `_${index}`;
    const prefixLen = Math.max(1, 50 - suffix.length);
    const candidate = `${base.slice(0, prefixLen)}${suffix}`;
    const [rows] =
      excludeUserId == null
        ? await connection.execute<RowDataPacket[]>(
            "SELECT id FROM users WHERE username = ? LIMIT 1",
            [candidate],
          )
        : await connection.execute<RowDataPacket[]>(
            "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
            [candidate, excludeUserId],
          );

    if (!rows.length) {
      return candidate;
    }
    index += 1;
  }
}

export async function loginDiscordUser(discordUser: DiscordUserInput): Promise<AppUser> {
  const discordId = String(discordUser.id || "").trim();
  if (!discordId) {
    throw new Error("Discord ID not found.");
  }

  const rawEmail = String(discordUser.email || "").trim().toLowerCase();
  const finalInputEmail =
    rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
      ? rawEmail
      : `discord_${discordId}@discord.local`;

  const discordName = usernameFromDiscord(discordUser);
  const discriminator = String(discordUser.discriminator || "0").trim() || "0";
  const avatarUrl = discordAvatarUrl(discordId, discordUser.avatar);

  const connection = await mainDb.getConnection();
  try {
    await connection.beginTransaction();

    const [byDiscord] = await connection.execute<RowDataPacket[]>(
      "SELECT id, email FROM users WHERE discord_id = ? LIMIT 1",
      [discordId],
    );

    if (byDiscord.length > 0) {
      const userId = Number(byDiscord[0].id);
      const emailCandidate = finalInputEmail;

      const [emailConflict] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [emailCandidate, userId],
      );
      const nextEmail = emailConflict.length ? String(byDiscord[0].email || emailCandidate) : emailCandidate;
      const nextUsername = await uniqueUsername(connection, discordName, userId);

      await connection.execute(
        `
          UPDATE users
          SET email = ?, username = ?, discriminator = ?, avatar = ?, last_login = NOW()
          WHERE id = ?
        `,
        [nextEmail, nextUsername, discriminator, avatarUrl, userId],
      );

      await connection.commit();
      const user = await fetchUserById(userId);
      if (!user) {
        throw new Error("Unable to load user.");
      }
      return user;
    }

    const [byEmail] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [finalInputEmail],
    );
    if (byEmail.length > 0) {
      const userId = Number(byEmail[0].id);
      await connection.execute(
        `
          UPDATE users
          SET discord_id = ?, discriminator = ?, avatar = ?, last_login = NOW()
          WHERE id = ?
        `,
        [discordId, discriminator, avatarUrl, userId],
      );

      await connection.commit();
      const user = await fetchUserById(userId);
      if (!user) {
        throw new Error("Unable to load user.");
      }
      return user;
    }

    const safeUsername = await uniqueUsername(connection, discordName);
    const randomPassword = await hash(randomBytes(24).toString("hex"), 12);
    const [insert] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO users (email, username, password, discord_id, discriminator, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [finalInputEmail, safeUsername, randomPassword, discordId, discriminator, avatarUrl],
    );

    await connection.commit();
    const user = await fetchUserById(Number(insert.insertId));
    if (!user) {
      throw new Error("Unable to create Discord user.");
    }
    return user;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
