import { describe, expect, it, vi } from "vitest";
import { createGoogleOAuthService } from "@/features/google/oauth";
import type { ConnectionStore } from "@/features/google/connection-store";
import type { SharedGoogleConnection } from "@/features/google/connection-record";

function setup(initial: SharedGoogleConnection | null = null, refreshToken: string | null = "plain-refresh-token") {
  let saved = initial;
  const store: ConnectionStore = {
    read: vi.fn(async () => saved),
    write: vi.fn(async (record) => { saved = record; }),
  };
  const oauth = {
    generateAuthUrl: vi.fn(({ state }: { state: string }) => `https://accounts.test/auth?state=${state}`),
    getToken: vi.fn(async () => ({ tokens: { refresh_token: refreshToken ?? undefined, scope: "scope" } })),
    setCredentials: vi.fn(),
  };
  const service = createGoogleOAuthService({
    store,
    createClient: () => oauth,
    encryptionKey: "key",
    encrypt: (value) => `encrypted:${value}`,
    decrypt: (value) => value.replace("encrypted:", ""),
    now: () => new Date("2026-09-24T12:00:00.000Z"),
  });
  return { service, store, oauth, getSaved: () => saved };
}

describe("shared Google OAuth service", () => {
  it("generates consent for the supplied state", () => {
    const { service, oauth } = setup();
    expect(service.beginGoogleOAuth("opaque-state")).toContain("state=opaque-state");
    expect(oauth.generateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({ access_type: "offline", prompt: "consent", state: "opaque-state" }));
  });

  it("encrypts and stores a new refresh token", async () => {
    const { service, getSaved } = setup();
    await service.finishGoogleOAuth("code");
    expect(getSaved()?.refreshTokenEncrypted).toBe("encrypted:plain-refresh-token");
    expect(await service.getConnectionStatus()).toEqual({ connected: true, connectedAt: "2026-09-24T12:00:00.000Z", needsAttention: false });
  });

  it("does not overwrite the connection without a refresh token", async () => {
    const { service, store } = setup(null, null);
    await expect(service.finishGoogleOAuth("code")).rejects.toMatchObject({ code: "GOOGLE_REAUTH_REQUIRED" });
    expect(store.write).not.toHaveBeenCalled();
  });

  it("throws when no shared connection exists", async () => {
    await expect(setup().service.getAuthorizedGoogleClient()).rejects.toMatchObject({ code: "GOOGLE_NOT_CONNECTED" });
  });

  it("decrypts the stored refresh token only for Google credentials", async () => {
    const initial: SharedGoogleConnection = { version: 1, refreshTokenEncrypted: "encrypted:refresh", connectedAt: "2026-09-23T00:00:00.000Z", updatedAt: "2026-09-23T00:00:00.000Z" };
    const { service, oauth } = setup(initial);
    await expect(service.getAuthorizedGoogleClient()).resolves.toBe(oauth);
    expect(oauth.setCredentials).toHaveBeenCalledWith({ refresh_token: "refresh" });
  });

  it("marks an unreadable encrypted token as needing attention", async () => {
    const initial: SharedGoogleConnection = { version: 1, refreshTokenEncrypted: "bad", connectedAt: "2026-09-23T00:00:00.000Z", updatedAt: "2026-09-23T00:00:00.000Z" };
    const base = setup(initial);
    const service = createGoogleOAuthService({
      store: base.store,
      createClient: () => base.oauth,
      encryptionKey: "key",
      encrypt: (value) => value,
      decrypt: () => { throw new Error("bad token"); },
      now: () => new Date(),
    });
    await expect(service.getConnectionStatus()).resolves.toEqual({ connected: false, connectedAt: initial.connectedAt, needsAttention: true });
  });
});
