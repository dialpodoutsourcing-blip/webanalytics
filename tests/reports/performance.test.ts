import { expect, it } from "vitest";
import { buildDateRange, normalizePerformanceRows, normalizePerformanceSummary, parsePerformanceRequest } from "@/features/reports/performance";

it("rejects reversed dates and unsafe row limits", () => {
  expect(() => parsePerformanceRequest({ property: "sc-domain:example.com", startDate: "2026-09-10", endDate: "2026-09-01", dimension: "query" })).toThrow();
  expect(parsePerformanceRequest({ property: "sc-domain:example.com", startDate: "2026-09-01", endDate: "2026-09-10", dimension: "query", rowLimit: 9000 }).rowLimit).toBe(1000);
});

it("accepts supported filters, pagination, and search types", () => {
  const result = parsePerformanceRequest({
    property: "sc-domain:example.com", startDate: "2026-09-01", endDate: "2026-09-10",
    dimension: "page", rowLimit: 250, startRow: 250, searchType: "image",
    filters: [{ dimension: "country", operator: "equals", expression: "usa" }],
  });
  expect(result).toMatchObject({ dimension: "page", rowLimit: 250, startRow: 250, searchType: "image" });
  expect(result.filters).toHaveLength(1);
});

it("normalizes an ungrouped row as authoritative headline metrics", () => {
  expect(normalizePerformanceSummary({ clicks: 25, impressions: 1790, ctr: .013966, position: 9.1 })).toEqual({
    clicks: 25, impressions: 1790, ctr: .013966, position: 9.1,
  });
});

it("builds stable preset date ranges", () => {
  expect(buildDateRange("28d", new Date("2026-09-23T12:00:00Z"))).toEqual({ startDate: "2026-08-27", endDate: "2026-09-23", hourly: false });
  expect(buildDateRange("24h", new Date("2026-09-23T12:00:00Z"))).toEqual({ startDate: "2026-09-22", endDate: "2026-09-23", hourly: true });
});

it("normalizes metrics without inventing missing rows", () => {
  expect(normalizePerformanceRows([{ keys: ["term"], clicks: 4, impressions: 100, ctr: .04, position: 3.2 }])).toEqual([
    { key: "term", clicks: 4, impressions: 100, ctr: .04, position: 3.2 },
  ]);
});
