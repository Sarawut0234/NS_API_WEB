type DbConfig = {
  host: string;
  port: number;
  name: string;
  user: string;
  pass: string;
  charset: string;
};

type WebhookConfig = {
  enabled: boolean;
  url: string;
  username: string;
  avatarUrl: string;
  timeoutSeconds: number;
};

type DiscordConfig = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

const TRUE_SET = new Set(["1", "true", "yes", "on"]);

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  return TRUE_SET.has(value.trim().toLowerCase());
}

function parseIntValue(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value: string | undefined): string[] {
  if (!value || !value.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item !== "");
}

function hasAnyPrefixedValue(prefix: string): boolean {
  return ["HOST", "PORT", "NAME", "USER", "PASS", "CHARSET"].some((key) => {
    const value = process.env[`${prefix}_${key}`];
    return value != null && value.trim() !== "";
  });
}

const sessionSecret =
  process.env.SESSION_SECRET?.trim() ||
  "dev_only_change_this_session_secret_to_a_long_random_value";

if (process.env.NODE_ENV === "production" && sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters in production.");
}

function dbConfig(prefix: string): DbConfig {
  return {
    host: process.env[`${prefix}_HOST`] || "localhost",
    port: parseIntValue(process.env[`${prefix}_PORT`], 3306),
    name: process.env[`${prefix}_NAME`] || "ns_system",
    user: process.env[`${prefix}_USER`] || "root",
    pass: process.env[`${prefix}_PASS`] || "",
    charset: process.env[`${prefix}_CHARSET`] || "utf8mb4",
  };
}

function discordConfig(baseUrl: string): DiscordConfig {
  const redirectDefault = `${baseUrl.replace(/\/+$/, "")}/api/auth/discord/callback`;
  return {
    enabled: parseBool(process.env.DISCORD_ENABLED, false),
    clientId: (process.env.DISCORD_CLIENT_ID || "").trim(),
    clientSecret: (process.env.DISCORD_CLIENT_SECRET || "").trim(),
    redirectUri: (process.env.DISCORD_REDIRECT_URI || redirectDefault).trim(),
  };
}

const appBaseUrl = process.env.APP_BASE_URL || "http://185.84.160.45:3000";
const railwayLicensePrefix = hasAnyPrefixedValue("RAILWAY_LICENSE_DB")
  ? "RAILWAY_LICENSE_DB"
  : "RAILWAY_DB";

export const env = {
  appBaseUrl,
  isProduction: process.env.NODE_ENV === "production",
  sessionSecret,
  sessionTtlSeconds: parseIntValue(process.env.SESSION_TTL_SECONDS, 86400),
  cartTtlSeconds: parseIntValue(process.env.CART_TTL_SECONDS, 60 * 60 * 24 * 7),
  oauthStateTtlSeconds: parseIntValue(process.env.OAUTH_STATE_TTL_SECONDS, 600),
  projectRoot: process.env.PROJECT_ROOT || process.cwd(),
  adminEmails: parseCsv(process.env.ADMIN_EMAILS),
  security: {
    rateLimitRedeem: parseIntValue(process.env.RATE_LIMIT_REDEEM, 10),
    rateLimitLogin: parseIntValue(process.env.RATE_LIMIT_LOGIN, 20),
    rateLimitIpUpdate: parseIntValue(process.env.RATE_LIMIT_IP_UPDATE, 20),
  },
  db: dbConfig("DB"),
  railwayAppDb: {
    enabled: parseBool(process.env.RAILWAY_APP_DB_ENABLED, false),
    ...dbConfig("RAILWAY_APP_DB"),
  },
  railwayLicenseDb: {
    enabled: parseBool(
      process.env.RAILWAY_LICENSE_DB_ENABLED,
      parseBool(process.env.RAILWAY_DB_ENABLED, false),
    ),
    ...dbConfig(railwayLicensePrefix),
  },
  discord: discordConfig(appBaseUrl),
  licenseWebhook: {
    enabled: parseBool(process.env.LICENSE_WEBHOOK_ENABLED, false),
    url: process.env.LICENSE_WEBHOOK_URL || "",
    username: process.env.LICENSE_WEBHOOK_USERNAME || "NS SYSTEM",
    avatarUrl: process.env.LICENSE_WEBHOOK_AVATAR_URL || "",
    timeoutSeconds: parseIntValue(process.env.LICENSE_WEBHOOK_TIMEOUT, 4),
  } satisfies WebhookConfig,
};
