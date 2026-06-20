import crypto from "crypto";

import type { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

const SESSION_COOKIE = "ns_system_session";
const CART_COOKIE = "ns_system_cart";
const DISCORD_STATE_COOKIE = "ns_discord_oauth_state";

type SessionPayload = {
  userId: number;
  exp: number;
};

type CartPayload = {
  items: Record<string, number>;
  exp: number;
};

function sign(body: string): string {
  return crypto.createHmac("sha256", env.sessionSecret).update(body).digest("base64url");
}

function encodeSigned(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSigned<T>(raw: string | undefined): T | null {
  if (!raw) {
    return null;
  }

  const [body, sig] = raw.split(".");
  if (!body || !sig) {
    return null;
  }

  const expected = sign(body);
  if (sig.length !== expected.length) {
    return null;
  }

  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (!crypto.timingSafeEqual(left, right)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function isValidFutureExp(exp: unknown): exp is number {
  return typeof exp === "number" && Number.isFinite(exp) && exp > Date.now();
}

export function getUserIdFromRequest(request: NextRequest): number | null {
  const parsed = decodeSigned<SessionPayload>(request.cookies.get(SESSION_COOKIE)?.value);
  if (!parsed || !isValidFutureExp(parsed.exp)) {
    return null;
  }
  if (!Number.isInteger(parsed.userId) || parsed.userId <= 0) {
    return null;
  }
  return parsed.userId;
}

export function setSessionCookie(response: NextResponse, userId: number): void {
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + env.sessionTtlSeconds * 1000,
  };

  response.cookies.set({
    name: SESSION_COOKIE,
    value: encodeSigned(payload),
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: env.sessionTtlSeconds,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
  });
}

function sanitizeCartItems(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>);
  const next: Record<string, number> = {};
  for (const [key, value] of entries) {
    const productId = Number.parseInt(key, 10);
    const qty = Number.parseInt(String(value), 10);
    if (!Number.isInteger(productId) || productId <= 0) {
      continue;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      continue;
    }
    next[String(productId)] = Math.min(999, qty);
  }
  return next;
}

export function getCartFromRequest(request: NextRequest): Record<string, number> {
  const parsed = decodeSigned<CartPayload>(request.cookies.get(CART_COOKIE)?.value);
  if (!parsed || !isValidFutureExp(parsed.exp)) {
    return {};
  }
  return sanitizeCartItems(parsed.items);
}

export function setCartCookie(response: NextResponse, items: Record<string, number>): void {
  const payload: CartPayload = {
    items: sanitizeCartItems(items),
    exp: Date.now() + env.cartTtlSeconds * 1000,
  };

  response.cookies.set({
    name: CART_COOKIE,
    value: encodeSigned(payload),
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: env.cartTtlSeconds,
  });
}

export function clearCartCookie(response: NextResponse): void {
  response.cookies.set({
    name: CART_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
  });
}

export function setDiscordStateCookie(response: NextResponse, state: string): void {
  response.cookies.set({
    name: DISCORD_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: env.oauthStateTtlSeconds,
  });
}

export function getDiscordStateFromRequest(request: NextRequest): string {
  return request.cookies.get(DISCORD_STATE_COOKIE)?.value || "";
}

export function clearDiscordStateCookie(response: NextResponse): void {
  response.cookies.set({
    name: DISCORD_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
  });
}
