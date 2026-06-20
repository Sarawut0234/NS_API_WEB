import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, loginDiscordUser } from "@/lib/auth";
import { exchangeDiscordCode, fetchDiscordUser, isDiscordEnabled } from "@/lib/discord";
import { env } from "@/lib/env";
import {
  clearDiscordStateCookie,
  getDiscordStateFromRequest,
  setSessionCookie,
} from "@/lib/session";

export const runtime = "nodejs";

function redirectLogin(request: NextRequest, message: string): NextResponse {
  const baseUrl = env.appBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/login`);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const text = error.message.trim();
    if (text) {
      return text;
    }
  }

  if (typeof error === "string") {
    const text = error.trim();
    if (text) {
      return text;
    }
  }

  if (error && typeof error === "object") {
    try {
      const text = JSON.stringify(error);
      if (text.trim()) {
        return text;
      }
    } catch {
      // ignore stringify failure
    }
  }

  return "Cannot sign in with Discord right now.";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDiscordEnabled()) {
    return redirectLogin(request, "Discord login is not configured.");
  }

  const activeUser = await getCurrentUser(request);
  const baseUrl = env.appBaseUrl.replace(/\/+$/, "");
  if (activeUser) {
    return NextResponse.redirect(new URL(`${baseUrl}/dashboard`));
  }

  const state = request.nextUrl.searchParams.get("state")?.trim() || "";
  const code = request.nextUrl.searchParams.get("code")?.trim() || "";
  const oauthError = request.nextUrl.searchParams.get("error")?.trim() || "";
  const cookieState = getDiscordStateFromRequest(request);

  if (oauthError) {
    const response = redirectLogin(request, "Discord authorization was cancelled.");
    clearDiscordStateCookie(response);
    return response;
  }

  if (!state || !cookieState || state !== cookieState) {
    const response = redirectLogin(request, "Invalid OAuth state.");
    clearDiscordStateCookie(response);
    return response;
  }

  if (!code) {
    const response = redirectLogin(request, "Missing Discord authorization code.");
    clearDiscordStateCookie(response);
    return response;
  }

  try {
    const token = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(token);
    const user = await loginDiscordUser(discordUser);

    const response = NextResponse.redirect(new URL(`${baseUrl}/dashboard`));
    clearDiscordStateCookie(response);
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    const message = normalizeErrorMessage(error);
    console.error("[discord-callback] sign-in failed", error);
    const response = redirectLogin(request, message);
    clearDiscordStateCookie(response);
    return response;
  }
}
