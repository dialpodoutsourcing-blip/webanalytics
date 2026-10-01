import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ unauthorized: vi.fn(), list: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/route-auth", () => ({ unauthorizedResponse: mocks.unauthorized }));
vi.mock("@/features/gbp/locations", () => ({ listStoredBusinessLocations: mocks.list, syncBusinessLocations: mocks.sync }));

import { GET, POST } from "@/app/api/gbp/locations/route";

describe("GBP location routes", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, "error").mockImplementation(() => undefined); mocks.unauthorized.mockResolvedValue(null); mocks.list.mockResolvedValue([{ googleLocationId: "locations/1" }]); mocks.sync.mockResolvedValue([{ googleLocationId: "locations/2" }]); });
  it("rejects unauthenticated reads and writes", async () => {
    const denied = new Response(null, { status: 401 }); mocks.unauthorized.mockResolvedValue(denied);
    expect(await GET()).toBe(denied); expect(await POST()).toBe(denied);
  });
  it("reads stored locations without synchronizing", async () => {
    expect(await (await GET()).json()).toEqual({ data: [{ googleLocationId: "locations/1" }] });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("synchronizes only on explicit POST", async () => {
    expect(await (await POST()).json()).toEqual({ data: [{ googleLocationId: "locations/2" }] });
    expect(mocks.sync).toHaveBeenCalledOnce();
  });
  it("reports and logs stored-location read failures without blaming Google", async () => {
    const cause = new Error("database read failed");
    mocks.list.mockRejectedValue(cause);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Saved Business Profile locations are temporarily unavailable." });
    expect(console.error).toHaveBeenCalledWith("GBP stored-location read failed", cause);
  });
  it("reports and logs Google synchronization failures", async () => {
    const cause = new Error("Google request failed");
    mocks.sync.mockRejectedValue(cause);

    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Business Profile synchronization failed. Check the Google connection and try again." });
    expect(console.error).toHaveBeenCalledWith("GBP location synchronization failed", cause);
  });
});
