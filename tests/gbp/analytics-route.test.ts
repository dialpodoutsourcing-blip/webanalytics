import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ unauthorized: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/route-auth", () => ({ unauthorizedResponse: mocks.unauthorized }));
vi.mock("@/features/gbp/performance", async (original) => ({ ...await original<object>(), getGbpAnalytics: mocks.get }));
import { GET } from "@/app/api/gbp/analytics/route";

describe("GBP analytics route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.unauthorized.mockResolvedValue(null); mocks.get.mockResolvedValue({ report: { locationId: "locations/1" }, stale: false }); });
  it("requires authentication", async () => { const denied = new Response(null, { status: 401 }); mocks.unauthorized.mockResolvedValue(denied); expect(await GET(new Request("https://test/api/gbp/analytics"))).toBe(denied); });
  it("rejects invalid queries", async () => { expect((await GET(new Request("https://test/api/gbp/analytics?locationId=locations/1&startDate=no&endDate=no"))).status).toBe(400); });
  it("returns normalized reports", async () => { const response = await GET(new Request("https://test/api/gbp/analytics?locationId=locations/1&startDate=2026-09-01&endDate=2026-09-30")); expect(await response.json()).toEqual({ data: { locationId: "locations/1" } }); });
});
