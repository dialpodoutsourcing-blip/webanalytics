import { describe, expect, it, vi } from "vitest";
import { getGbpAnalytics, normalizeDailyMetrics, parseGbpAnalyticsRequest } from "@/features/gbp/performance";

describe("GBP performance", () => {
  it("validates an inclusive range no longer than 18 months", () => {
    expect(parseGbpAnalyticsRequest({ locationId: "locations/1", startDate: "2026-09-01", endDate: "2026-09-30" })).toMatchObject({ locationId: "locations/1" });
    expect(() => parseGbpAnalyticsRequest({ locationId: "locations/1", startDate: "2026-10-01", endDate: "2026-09-30" })).toThrow();
    expect(() => parseGbpAnalyticsRequest({ locationId: "locations/1", startDate: "2024-01-01", endDate: "2026-09-30" })).toThrow();
  });

  it("preserves zero values and leaves absent series empty", () => {
    expect(normalizeDailyMetrics({ multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [{ dailyMetric: "CALL_CLICKS", timeSeries: { datedValues: [{ date: { year: 2026, month: 9, day: 1 }, value: "0" }] } }] }] })).toMatchObject({
      calls: [{ date: "2026-09-01", value: 0 }], directions: [], websiteClicks: [], impressions: [],
    });
  });

  it("returns stale cached analytics when Google is unavailable", async () => {
    const cached = { locationId: "locations/1", startDate: "2026-09-01", endDate: "2026-09-30", daily: { calls: [], directions: [], websiteClicks: [], impressions: [] }, searchQueries: [], fetchedAt: "old" };
    const cache = { read: vi.fn(async () => ({ report: cached, fresh: false })), write: vi.fn() };
    const client = { fetchDaily: vi.fn(async () => { throw new Error("down"); }), fetchKeywords: vi.fn() };
    await expect(getGbpAnalytics(parseGbpAnalyticsRequest({ locationId: "locations/1", startDate: "2026-09-01", endDate: "2026-09-30" }), { client, cache, locationExists: async () => true, now: () => new Date() })).resolves.toEqual({ report: cached, stale: true });
  });
});
