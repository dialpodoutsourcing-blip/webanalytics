import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PerformanceReport } from "@/components/performance/performance-report";

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));

it("renders metric controls and every Search Console dimension tab", () => {
  render(<PerformanceReport />);
  for (const name of ["Total clicks", "Total impressions", "Average CTR", "Average position"]) expect(screen.getByText(name)).toBeInTheDocument();
  for (const name of ["Queries", "Pages", "Countries", "Devices", "Search appearance", "Dates"]) expect(screen.getByRole("tab", { name })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Queries" })).toHaveAttribute("title", "Search terms people used to find your website.");
  expect(screen.getByRole("tab", { name: "Pages" })).toHaveAttribute("title", "Website pages that appeared in Google Search.");
});
