import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NODE_ENV: "development",
  PORTAL_USERNAME: "admin",
  PORTAL_PASSWORD: "admin",
  SESSION_SECRET: "12345678901234567890123456789012",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://portal:portal@localhost:5432/web_analytics",
  GOOGLE_CLIENT_ID: "client",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
  GOOGLE_CRUX_API_KEY: "key",
  TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  DATAFORSEO_LOGIN: "login",
  DATAFORSEO_PASSWORD: "password",
  GEOGRID_MAX_SCAN_USD: "1",
  GEOGRID_WEEKLY_LIMIT_USD: "10",
  GEOGRID_MONTHLY_LIMIT_USD: "30",
  GEOGRID_SCHEDULER_SECRET: "12345678901234567890123456789012",
  NEXT_PUBLIC_MAP_TILE_URL: "https://tiles.example.com/{z}/{x}/{y}.png",
};

describe("parseEnv", () => {
  it("rejects a missing session secret", () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: undefined })).toThrow(/SESSION_SECRET/);
  });

  it("accepts the requested local admin credentials", () => {
    expect(parseEnv(valid).PORTAL_USERNAME).toBe("admin");
  });

  it("rejects the admin password in production", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).toThrow(/PORTAL_PASSWORD/);
  });

  it("rejects ephemeral SQLite storage in production", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production", PORTAL_PASSWORD: "secure", DATABASE_URL: "file:./prod.db" })).toThrow(/DATABASE_URL/);
  });

  it("rejects non-positive geo-grid spending limits", () => {
    expect(() => parseEnv({ ...valid, GEOGRID_MAX_SCAN_USD: "0" })).toThrow(/GEOGRID_MAX_SCAN_USD/);
  });
});
