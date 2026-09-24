import { decodeJwt } from "jose";
import { describe, expect, it } from "vitest";
import {
  createOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/features/google/oauth-state";

const secret = "a-session-secret-that-is-at-least-32-characters";
const now = new Date("2026-09-24T12:00:00.000Z");

describe("OAuth state", () => {
  it("creates an opaque state whose signed cookie verifies", async () => {
    const created = await createOAuthState(secret, now);
    expect(GOOGLE_OAUTH_STATE_COOKIE).toBe("google_oauth_state");
    expect(await verifyOAuthState(created.cookieValue, created.state, secret, now)).toBe(true);
    expect(JSON.stringify(decodeJwt(created.cookieValue))).not.toContain(created.state);
  });

  it.each([
    ["wrong query state", "different", secret, now],
    ["wrong secret", undefined, "another-session-secret-that-is-long-enough", now],
    ["expired state", undefined, secret, new Date("2026-09-24T12:11:00.000Z")],
  ])("rejects %s", async (_name, stateOverride, secretOverride, checkedAt) => {
    const created = await createOAuthState(secret, now);
    expect(await verifyOAuthState(created.cookieValue, stateOverride ?? created.state, secretOverride, checkedAt)).toBe(false);
  });

  it("rejects missing and malformed cookies", async () => {
    expect(await verifyOAuthState(undefined, "state", secret, now)).toBe(false);
    expect(await verifyOAuthState("not-a-jwt", "state", secret, now)).toBe(false);
  });
});
