import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LocationPicker } from "@/components/local-seo/location-picker";

afterEach(cleanup);

it("selects locations and exposes scan eligibility as text", () => {
  const onChange = vi.fn();
  render(<LocationPicker value="" onChange={onChange} locations={[
    { googleLocationId: "locations/1", title: "Open Vet", address: "1 Main", status: "OPEN", latitude: 1, longitude: 2 },
    { googleLocationId: "locations/2", title: "Closed Vet", address: null, status: "CLOSED", latitude: null, longitude: null },
  ]}/>);
  expect(screen.getByRole("option", { name: /Closed Vet — Closed, no map coordinates/i })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: /business profile location/i }), { target: { value: "locations/1" } });
  expect(onChange).toHaveBeenCalledWith("locations/1");
});

it("renders an empty state", () => {
  render(<LocationPicker value="" onChange={() => undefined} locations={[]}/>);
  expect(screen.getByText(/No Business Profile locations/i)).toBeInTheDocument();
});
