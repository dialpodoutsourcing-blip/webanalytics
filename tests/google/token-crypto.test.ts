import { expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/features/google/token-crypto";

it("round trips a token without storing it as plaintext", () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  const encrypted = encryptToken("refresh-secret", key);
  expect(encrypted).not.toContain("refresh-secret");
  expect(decryptToken(encrypted, key)).toBe("refresh-secret");
});
