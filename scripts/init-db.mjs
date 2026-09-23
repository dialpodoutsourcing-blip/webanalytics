import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const configured = process.env.DATABASE_URL ?? "file:./dev.db";
if (!configured.startsWith("file:")) throw new Error("db:init supports SQLite file URLs only");
const dbPath = resolve("prisma", configured.slice(5));
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
CREATE TABLE IF NOT EXISTS "GoogleConnection" (
  "id" TEXT NOT NULL PRIMARY KEY, "accountEmail" TEXT,
  "accessTokenEncrypted" TEXT, "refreshTokenEncrypted" TEXT,
  "scope" TEXT, "tokenExpiresAt" DATETIME,
  "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT NOT NULL PRIMARY KEY, "value" TEXT NOT NULL, "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "CachedReport" (
  "id" TEXT NOT NULL PRIMARY KEY, "cacheKey" TEXT NOT NULL,
  "reportType" TEXT NOT NULL, "propertyId" TEXT, "parametersJson" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL, "fetchedAt" DATETIME NOT NULL, "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "CachedReport_cacheKey_key" ON "CachedReport"("cacheKey");
CREATE INDEX IF NOT EXISTS "CachedReport_reportType_propertyId_idx" ON "CachedReport"("reportType", "propertyId");
CREATE TABLE IF NOT EXISTS "OAuthState" (
  "stateHash" TEXT NOT NULL PRIMARY KEY, "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
db.close();
console.log(`Initialized SQLite database at ${dbPath}`);
