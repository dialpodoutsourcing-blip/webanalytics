import { describe, expect, it } from "vitest";
import { normalizeKeyword, createKeywordInput, updateKeywordInput } from "@/features/gbp/keywords";

describe("GBP keywords", () => {
  it("normalizes identity without losing Unicode", () => { expect(normalizeKeyword("  Holistic   VÉT  ")).toBe("holistic vét"); });
  it("rejects empty and overlong values", () => { expect(() => createKeywordInput.parse({ locationId: "locations/1", keyword: "  ", source: "MANUAL" })).toThrow(); expect(() => createKeywordInput.parse({ locationId: "locations/1", keyword: "x".repeat(201), source: "MANUAL" })).toThrow(); });
  it("requires explicit approved or paused state changes", () => { expect(updateKeywordInput.parse({ id: "key", state: "APPROVED" }).state).toBe("APPROVED"); expect(() => updateKeywordInput.parse({ id: "key", state: "SUGGESTED" })).toThrow(); });
});
