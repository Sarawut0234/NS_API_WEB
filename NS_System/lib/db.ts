import mysql from "mysql2/promise";

import { env } from "@/lib/env";

const sharedOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
} as const;

function createPool(config: {
  host: string;
  port: number;
  user: string;
  pass: string;
  name: string;
  charset: string;
}) {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.pass,
    database: config.name,
    charset: config.charset,
    ...sharedOptions,
  });
}

export const usingRailwayMainDb = env.railwayAppDb.enabled;
export const mainDb = createPool(usingRailwayMainDb ? env.railwayAppDb : env.db);

export const usingRailwayLicenseDb = env.railwayLicenseDb.enabled;
export const licenseDb = usingRailwayLicenseDb
  ? createPool(env.railwayLicenseDb)
  : mainDb;

export const mainDbLabel = usingRailwayMainDb ? "Railway App MySQL" : "Local MySQL";
export const licenseDbLabel = usingRailwayLicenseDb ? "Railway License MySQL" : mainDbLabel;
