import { describe, expect, it, vi } from "vitest";
import { createConnectionStore } from "@/features/google/connection-store";
import type { SharedGoogleConnection } from "@/features/google/connection-record";

const record: SharedGoogleConnection = {
  version: 1,
  refreshTokenEncrypted: "cipher",
  connectedAt: "2026-09-24T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
};

describe("createConnectionStore", () => {
  it("returns null when the shared object does not exist", async () => {
    const store = createConnectionStore({ getObject: async () => null, putObject: vi.fn() });
    await expect(store.read()).resolves.toBeNull();
  });

  it("parses a valid shared connection", async () => {
    const store = createConnectionStore({ getObject: async () => record, putObject: vi.fn() });
    await expect(store.read()).resolves.toEqual(record);
  });

  it("rejects malformed stored data", async () => {
    const store = createConnectionStore({ getObject: async () => ({ version: 2 }), putObject: vi.fn() });
    await expect(store.read()).rejects.toThrow();
  });

  it("writes one private stable object", async () => {
    const putObject = vi.fn().mockResolvedValue(undefined);
    const store = createConnectionStore({ getObject: async () => null, putObject });
    await store.write(record);
    expect(putObject).toHaveBeenCalledWith(
      "private/google/shared-connection.json",
      JSON.stringify(record),
      {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      },
    );
  });
});
