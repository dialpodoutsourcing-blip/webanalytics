import { describe, expect, it, vi } from "vitest";
import { createGbpClient, GbpProviderError } from "@/features/gbp/client";

describe("GBP client provider failures", () => {
  it("preserves safe Google error details without exposing the access token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: {
        code: 403,
        status: "PERMISSION_DENIED",
        message: "My Business Account Management API has not been used in project 123 before or it is disabled.",
      },
    }), { status: 403, headers: { "content-type": "application/json" } }));
    const getAuth = vi.fn().mockResolvedValue({ getAccessToken: vi.fn().mockResolvedValue({ token: "secret-access-token" }) });
    const client = createGbpClient({ getAuth, fetchImpl: fetchImpl as typeof fetch });

    await expect(client.listAccounts()).rejects.toMatchObject({
      code: "GOOGLE_REAUTH_REQUIRED",
      cause: expect.objectContaining({
        status: 403,
        googleCode: 403,
        googleStatus: "PERMISSION_DENIED",
        message: "My Business Account Management API has not been used in project 123 before or it is disabled.",
      }),
    });
    const providerError = await client.listAccounts().catch((error: unknown) => (error as { cause?: unknown }).cause);
    expect(providerError).toBeInstanceOf(GbpProviderError);
    expect(JSON.stringify(providerError)).not.toContain("secret-access-token");
  });
});
