import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ unauthorized: vi.fn(), list: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/route-auth", () => ({ unauthorizedResponse: mocks.unauthorized }));
vi.mock("@/features/gbp/locations", () => ({ listStoredBusinessLocations: mocks.list, syncBusinessLocations: mocks.sync }));

import { GET, POST } from "@/app/api/gbp/locations/route";

describe("GBP location routes", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.unauthorized.mockResolvedValue(null); mocks.list.mockResolvedValue([{ googleLocationId: "locations/1" }]); mocks.sync.mockResolvedValue([{ googleLocationId: "locations/2" }]); });
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
});
