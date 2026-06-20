import { NextRequest, NextResponse } from "next/server";

import {
  buildDiscordAuthorizeUrl,
  generateDiscordState,
  isDiscordEnabled,
} from "@/lib/discord";
import { env } from "@/lib/env";
import { setDiscordStateCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isDiscordEnabled()) {
    const baseUrl = env.appBaseUrl.replace(/\/+$/, "");
    const redirectUrl = new URL(`${baseUrl}/login?error=Discord%20login%20is%20not%20configured`);
    return NextResponse.redirect(redirectUrl);
  }

  const state = generateDiscordState();
  const authorizeUrl = buildDiscordAuthorizeUrl(state);
  const response = NextResponse.redirect(authorizeUrl);
  setDiscordStateCookie(response, state);
  return response;
}
