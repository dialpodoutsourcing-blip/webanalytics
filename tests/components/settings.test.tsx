import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const status = vi.hoisted(() => vi.fn());
vi.mock("@/features/google/oauth", () => ({ getConnectionStatus: status }));

import Settings from "@/app/(dashboard)/settings/page";

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("shows the shared owner connection and reconnect action", async () => {
  status.mockResolvedValue({ connected: true, connectedAt: "2026-09-24T12:00:00.000Z", needsAttention: false });
  render(await Settings({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Connected owner Google account")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Reconnect Google" })).toHaveAttribute("href", "/api/auth/google/start");
});

it("offers the one-time owner connection when disconnected", async () => {
  status.mockResolvedValue({ connected: false, connectedAt: null, needsAttention: false });
  render(await Settings({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("link", { name: "Connect owner Google account" })).toBeInTheDocument();
});

it("shows safe recovery guidance after a connection failure", async () => {
  status.mockResolvedValue({ connected: false, connectedAt: null, needsAttention: true });
  render(await Settings({ searchParams: Promise.resolve({ error: "google_connection" }) }));
  expect(screen.getByText(/could not be saved/i)).toBeInTheDocument();
  expect(screen.queryByText(/provider details/i)).not.toBeInTheDocument();
});
