import { describe, expect, it } from "vitest";
import { parseConnectionRecord } from "@/features/google/connection-record";

const valid = {
  version: 1,
  refreshTokenEncrypted: "cipher",
  connectedAt: "2026-09-24T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
};

describe("parseConnectionRecord", () => {
  it("accepts the supported versioned record", () => {
    expect(parseConnectionRecord(valid)).toEqual(valid);
  });

  it.each([
    ["unsupported version", { ...valid, version: 2 }],
    ["empty encrypted token", { ...valid, refreshTokenEncrypted: "" }],
    ["invalid connection timestamp", { ...valid, connectedAt: "yesterday" }],
    ["null input", null],
  ])("rejects %s", (_name, value) => {
    expect(() => parseConnectionRecord(value)).toThrow();
  });
});
