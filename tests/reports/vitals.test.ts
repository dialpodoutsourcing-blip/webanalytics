import { expect, it } from "vitest";
import { normalizeCruxResponse } from "@/features/reports/vitals";

it("turns a missing CrUX record into insufficient data instead of zeroes", () => {
  expect(normalizeCruxResponse(null)).toEqual({ status: "insufficient-data", metrics: [] });
});

it("normalizes recognized p75 metrics", () => {
  expect(normalizeCruxResponse({ metrics: { largest_contentful_paint: { percentiles: { p75: 2100 }, histogram: [{ start: 0, end: 2500, density: .8 }] } } })).toEqual({
    status: "available", metrics: [{ name: "LCP", value: 2100, unit: "ms", rating: "good", goodDensity: .8 }],
  });
});

it("keeps a valid zero-valued CLS metric", () => {
  expect(normalizeCruxResponse({ metrics: { cumulative_layout_shift: { percentiles: { p75: 0 }, histogram: [{ density: 1 }] } } }).metrics[0]?.value).toBe(0);
});
