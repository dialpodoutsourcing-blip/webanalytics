import { expect, it } from "vitest";
import { readOverviewPerformance } from "@/components/dashboard-client";

it("reads the upgraded performance response without treating it as an array", () => {
  const report = readOverviewPerformance({
    summary: { clicks: 25, impressions: 1790, ctr: .014, position: 9.1 },
    series: [], rows: [{ key: "sunrise suites", clicks: 4, impressions: 165, ctr: .024, position: 3 }],
    page: 1, pageSize: 250, fetchedAt: "2026-09-23T12:00:00Z",
  });
  expect(report.summary.clicks).toBe(25);
  expect(report.rows).toHaveLength(1);
});
