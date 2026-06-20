import { randomBytes } from "crypto";

import { env } from "@/lib/env";

type DiscordTokenResponse = {
  access_token: string;
};

type DiscordUser = {
  id: string;
  email?: string;
  username?: string;
  global_name?: string;
  discriminator?: string;
  avatar?: string | null;
};

export function isDiscordEnabled(): boolean {
  return (
    env.discord.enabled &&
    env.discord.clientId.trim() !== "" &&
    env.discord.clientSecret.trim() !== ""
  );
}

export function generateDiscordState(): string {
  return randomBytes(24).toString("hex");
}

export function buildDiscordAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.discord.clientId,
    scope: "identify email",
    state,
    redirect_uri: env.discord.redirectUri,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

type DiscordApiErrorShape = {
  error?: string;
  error_description?: string;
  message?: string;
};

async function extractDiscordError(response: Response): Promise<string> {
  const status = `${response.status} ${response.statusText}`.trim();
  const bodyText = await response.text().catch(() => "");
  if (!bodyText.trim()) {
    return status;
  }

  try {
    const parsed = JSON.parse(bodyText) as DiscordApiErrorShape;
    const parts = [parsed.error, parsed.error_description, parsed.message]
      .map((item) => String(item || "").trim())
      .filter((item) => item.length > 0);
    if (parts.length > 0) {
      return `${status} - ${parts.join(" | ")}`;
    }
  } catch {
    // ignore JSON parse failure and fallback to raw text
  }

  const compactText = bodyText.replace(/\s+/g, " ").trim();
  return compactText ? `${status} - ${compactText}` : status;
}

export async function exchangeDiscordCode(code: string): Promise<string> {
  const payload = new URLSearchParams({
    client_id: env.discord.clientId,
    client_secret: env.discord.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.discord.redirectUri,
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
  });

  if (!response.ok) {
    const detail = await extractDiscordError(response);
    throw new Error(`Discord token exchange failed: ${detail}`);
  }

  const data = (await response.json().catch(() => null)) as DiscordTokenResponse | null;
  if (!data?.access_token) {
    throw new Error("Discord token response is missing access_token.");
  }

  return data.access_token;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch("https://discord.com/api/users/@me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await extractDiscordError(response);
    throw new Error(`Discord profile fetch failed: ${detail}`);
  }

  const data = (await response.json().catch(() => null)) as DiscordUser | null;
  if (!data?.id) {
    throw new Error("Invalid Discord user response.");
  }
  return data;
}
