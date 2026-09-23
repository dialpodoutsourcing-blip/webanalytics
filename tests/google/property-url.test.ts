import { describe, expect, it } from "vitest";
import { urlBelongsToProperty } from "@/features/google/property-url";

describe("urlBelongsToProperty", () => {
  it("enforces URL-prefix origin and path boundaries", () => {
    expect(urlBelongsToProperty("https://example.com/blog/post", "https://example.com/blog/")).toBe(true);
    expect(urlBelongsToProperty("https://example.com/blogger", "https://example.com/blog/")).toBe(false);
    expect(urlBelongsToProperty("https://example.com.evil.test/blog/", "https://example.com/blog/")).toBe(false);
    expect(urlBelongsToProperty("http://example.com/blog/", "https://example.com/blog/")).toBe(false);
  });

  it("accepts only the apex and true subdomains of domain properties", () => {
    expect(urlBelongsToProperty("https://example.com/a", "sc-domain:example.com")).toBe(true);
    expect(urlBelongsToProperty("https://www.example.com/a", "sc-domain:example.com")).toBe(true);
    expect(urlBelongsToProperty("https://notexample.com/a", "sc-domain:example.com")).toBe(false);
    expect(urlBelongsToProperty("https://example.com.evil.test/a", "sc-domain:example.com")).toBe(false);
    expect(urlBelongsToProperty("ftp://example.com/a", "sc-domain:example.com")).toBe(false);
  });
});
