import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { DevelopmentLink } from "@/components/development-link";

it("opens an accessible development dialog instead of navigating", () => {
  render(<DevelopmentLink feature="URL Inspection" description="Inspect individual URLs.">URL Inspection</DevelopmentLink>);
  fireEvent.click(screen.getByRole("button", { name: "URL Inspection" }));
  expect(screen.getByRole("dialog", { name: "URL Inspection — Still in Development" })).toBeInTheDocument();
  expect(screen.getByText("Still in Development")).toBeInTheDocument();
  expect(screen.getByRole("dialog").parentElement?.parentElement).toBe(document.body);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
