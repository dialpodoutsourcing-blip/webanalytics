import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PerformanceChart } from "@/components/performance/performance-chart";

it("exposes only clicks and impressions as chart series", () => {
  render(<PerformanceChart rows={[{ key: "2026-09-23", clicks: 2, impressions: 40, ctr: .05, position: 8 }]} />);
  expect(screen.getByText("Clicks")).toBeInTheDocument();
  expect(screen.getByText("Impressions")).toBeInTheDocument();
  expect(screen.queryByText("CTR")).not.toBeInTheDocument();
  expect(screen.queryByText("Position")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Clicks and impressions gradient area chart")).toBeInTheDocument();
});
