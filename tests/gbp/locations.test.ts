import { describe, expect, it, vi } from "vitest";
import { syncBusinessLocations } from "@/features/gbp/locations";
import type { BusinessLocationSummary } from "@/features/gbp/types";

describe("syncBusinessLocations", () => {
  it("paginates accounts and locations, deduplicates, and preserves coordinate eligibility", async () => {
    const client = {
      listAccounts: vi.fn(async (token?: string) => token ? { accounts: [{ name: "accounts/2" }] } : { accounts: [{ name: "accounts/1" }], nextPageToken: "accounts-next" }),
      listLocations: vi.fn(async (account: string, token?: string) => {
        if (account === "accounts/1" && !token) return { locations: [{ name: "locations/10", title: "Open Vet", storefrontAddress: { addressLines: ["1 Main St"], locality: "Orlando" }, latlng: { latitude: 28.5, longitude: -81.3 }, openInfo: { status: "OPEN" }, categories: { primaryCategory: { displayName: "Veterinarian" } } }], nextPageToken: "locations-next" };
        if (account === "accounts/1") return { locations: [{ name: "locations/10", title: "Open Vet duplicate" }] };
        return { locations: [{ name: "locations/20", title: "Closed Vet", openInfo: { status: "CLOSED_PERMANENTLY" } }] };
      }),
    };
    const saved: BusinessLocationSummary[] = [];
    const store = {
      upsert: vi.fn(async (value: BusinessLocationSummary) => { saved.push(value); }),
      list: vi.fn(async () => saved),
    };

    const result = await syncBusinessLocations({ client, store, now: () => new Date("2026-09-30T12:00:00.000Z") });

    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({ googleLocationId: "locations/10", googleAccountId: "accounts/1", title: "Open Vet", address: "1 Main St, Orlando", latitude: 28.5, longitude: -81.3, status: "OPEN", isTrackingActive: false });
    expect(saved[1]).toMatchObject({ googleLocationId: "locations/20", status: "CLOSED", latitude: null, longitude: null, isTrackingActive: false });
    expect(result).toEqual(saved);
  });

  it("does not delete stored locations missing from the latest provider response", async () => {
    const existing: BusinessLocationSummary = { id: "stored", googleLocationId: "locations/old", googleAccountId: "accounts/old", title: "Historical", address: null, latitude: null, longitude: null, primaryCategory: null, status: "UNKNOWN", isTrackingActive: false, lastSynchronizedAt: new Date("2026-01-01T00:00:00.000Z") };
    const store = { upsert: vi.fn(), list: vi.fn(async () => [existing]) };
    const client = { listAccounts: vi.fn(async () => ({ accounts: [] })), listLocations: vi.fn() };
    await expect(syncBusinessLocations({ client, store, now: () => new Date() })).resolves.toEqual([existing]);
    expect(store.upsert).not.toHaveBeenCalled();
  });
});
