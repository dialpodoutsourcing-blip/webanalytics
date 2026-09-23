import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReportState } from "@/components/report-state";

it("renders an accessible insufficient-data message", () => {
  render(<ReportState kind="empty" title="Insufficient field data" message="CrUX has no record for this selection." />);
  expect(screen.getByRole("status")).toHaveTextContent("Insufficient field data");
});
