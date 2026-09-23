import { expect, it } from "vitest";
import { verifyPortalCredentials } from "@/features/auth/credentials";

it("accepts only the exact configured credentials", () => {
  expect(verifyPortalCredentials("admin", "admin", { username: "admin", password: "admin" })).toBe(true);
  expect(verifyPortalCredentials("Admin", "admin", { username: "admin", password: "admin" })).toBe(false);
  expect(verifyPortalCredentials("admin", "wrong", { username: "admin", password: "admin" })).toBe(false);
});
