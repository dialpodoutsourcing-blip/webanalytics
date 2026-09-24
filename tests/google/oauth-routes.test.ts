import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  unauthorized: vi.fn(),
  cookies: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  createState: vi.fn(),
  verifyState: vi.fn(),
  begin: vi.fn(),
  finish: vi.fn(),
}));

vi.mock("@/lib/route-auth", () => ({ unauthorizedResponse: mocks.unauthorized }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ SESSION_SECRET: "a-session-secret-that-is-at-least-32-characters", NODE_ENV: "production" }) }));
vi.mock("@/features/google/oauth-state", () => ({
  GOOGLE_OAUTH_STATE_COOKIE: "google_oauth_state",
  createOAuthState: mocks.createState,
  verifyOAuthState: mocks.verifyState,
}));
vi.mock("@/features/google/oauth", () => ({ beginGoogleOAuth: mocks.begin, finishGoogleOAuth: mocks.finish }));

import { GET as start } from "@/app/api/auth/google/start/route";
import { GET as callback } from "@/app/api/auth/google/callback/route";

describe("Google OAuth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unauthorized.mockResolvedValue(null);
    mocks.cookies.mockResolvedValue({ get: mocks.cookieGet, set: mocks.cookieSet });
    mocks.createState.mockResolvedValue({ state: "opaque", cookieValue: "signed" });
    mocks.begin.mockReturnValue("https://accounts.google.test/consent");
    mocks.verifyState.mockResolvedValue(true);
    mocks.finish.mockResolvedValue(undefined);
    mocks.cookieGet.mockReturnValue({ value: "signed" });
  });

  it("rejects an unauthenticated start request", async () => {
    const denied = new Response(null, { status: 401 });
    mocks.unauthorized.mockResolvedValue(denied);
    expect(await start()).toBe(denied);
    expect(mocks.createState).not.toHaveBeenCalled();
  });

  it("sets a secure short-lived state cookie before redirecting", async () => {
    const response = await start();
    expect(response.headers.get("location")).toBe("https://accounts.google.test/consent");
    expect(mocks.cookieSet).toHaveBeenCalledWith("google_oauth_state", "signed", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 600,
      path: "/api/auth/google/callback",
    });
  });

  it("clears and rejects mismatched state before code exchange", async () => {
    mocks.verifyState.mockResolvedValue(false);
    const response = await callback(new Request("https://portal.test/api/auth/google/callback?code=code&state=wrong"));
    expect(mocks.cookieSet).toHaveBeenCalledWith("google_oauth_state", "", expect.objectContaining({ maxAge: 0, path: "/api/auth/google/callback" }));
    expect(mocks.finish).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://portal.test/settings?error=google_connection");
  });

  it("exchanges a valid code and redirects to connected Settings", async () => {
    const response = await callback(new Request("https://portal.test/api/auth/google/callback?code=code&state=opaque"));
    expect(mocks.finish).toHaveBeenCalledWith("code");
    expect(response.headers.get("location")).toBe("https://portal.test/settings?connected=1");
  });

  it("clears state and redirects safely when Google exchange fails", async () => {
    mocks.finish.mockRejectedValue(new Error("provider details"));
    const response = await callback(new Request("https://portal.test/api/auth/google/callback?code=code&state=opaque"));
    expect(mocks.cookieSet).toHaveBeenCalledWith("google_oauth_state", "", expect.objectContaining({ maxAge: 0, path: "/api/auth/google/callback" }));
    expect(response.headers.get("location")).toBe("https://portal.test/settings?error=google_connection");
  });
});
