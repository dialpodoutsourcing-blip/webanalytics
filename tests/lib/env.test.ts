import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NODE_ENV: "development",
  PORTAL_USERNAME: "admin",
  PORTAL_PASSWORD: "admin",
  SESSION_SECRET: "12345678901234567890123456789012",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "file:./dev.db",
  GOOGLE_CLIENT_ID: "client",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
  GOOGLE_CRUX_API_KEY: "key",
  TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
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
});
