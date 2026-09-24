import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { PropertyPicker, readOverviewPerformance } from "@/components/dashboard-client";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("reads the upgraded performance response without treating it as an array", () => {
  const report = readOverviewPerformance({
    summary: { clicks: 25, impressions: 1790, ctr: .014, position: 9.1 },
    series: [], rows: [{ key: "sunrise suites", clicks: 4, impressions: 165, ctr: .024, position: 3 }],
    page: 1, pageSize: 250, fetchedAt: "2026-09-23T12:00:00Z",
  });
  expect(report.summary.clicks).toBe(25);
  expect(report.rows).toHaveLength(1);
});

it("directs a property failure to the shared owner connection", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ error: "The shared Google connection is unavailable. Ask the portal owner to reconnect it in Settings." }) })));
  render(createElement(PropertyPicker));
  await waitFor(() => expect(screen.getByText(/shared Google connection is unavailable/i)).toBeInTheDocument());
  expect(screen.queryByRole("link", { name: /connect google/i })).not.toBeInTheDocument();
});
