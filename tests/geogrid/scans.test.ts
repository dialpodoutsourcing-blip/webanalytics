import { expect, it, vi } from "vitest";
import { advanceScan, createScan } from "@/features/geogrid/scans";

const target = {
  location: { id: "loc", googleLocationId: "locations/1", title: "Lotus Vet", address: "1 Main", latitude: 28.5, longitude: -81.3, status: "OPEN", isTrackingActive: true },
  keyword: { id: "key", displayKeyword: "veterinarian", state: "APPROVED", defaultGridSize: 3, radiusKm: 1, languageCode: "en" },
};
const options = { limits: { maxScanMicroUsd: 100000, weeklyLimitMicroUsd: 100000, monthlyLimitMicroUsd: 100000 }, pricePerTaskMicroUsd: 600, now: () => new Date("2026-09-30T00:00:00Z") };

it("reuses a fingerprint before submitting paid tasks", async () => {
  const existing = { id: "scan-existing", status: "RUNNING" };
  const repo = { getTarget: vi.fn(async () => target), findByFingerprint: vi.fn(async () => existing), getSpend: vi.fn(), create: vi.fn(), saveSubmitted: vi.fn() };
  const provider = { submitMapTasks: vi.fn() };
  await expect(createScan({ locationId: "locations/1", keywordId: "key" }, "MANUAL", { ...options, repo, provider })).resolves.toBe(existing);
  expect(provider.submitMapTasks).not.toHaveBeenCalled();
});

it("persists completed provider tasks without resubmitting points", async () => {
  const repo = { getSubmitted: vi.fn(async () => ({ target: { name: "Lotus Vet", address: "1 Main", placeId: "target" }, points: [{ id: "point", providerTaskId: "task-1" }] })), saveResults: vi.fn(async () => ({ id: "scan", status: "COMPLETE" })) };
  const provider = { getMapTasks: vi.fn(async () => [{ id: "task-1", costUsd: .0006, status: "COMPLETE" as const, items: [{ rank_group: 2, title: "Lotus Vet", place_id: "target", address: "1 Main" }] }]) };
  await expect(advanceScan("scan", { repo, provider })).resolves.toMatchObject({ status: "COMPLETE" });
  expect(repo.saveResults).toHaveBeenCalledWith("scan", [expect.objectContaining({ pointId: "point", rank: 2, confidence: "EXACT" })]);
});

it("creates and submits each point after cost admission", async () => {
  const repo = { getTarget: vi.fn(async () => target), findByFingerprint: vi.fn(async () => null), getSpend: vi.fn(async () => ({ weekMicroUsd: 0, monthMicroUsd: 0 })), create: vi.fn(async (input) => ({ id: "scan", ...input })), saveSubmitted: vi.fn(async () => ({ id: "scan", status: "RUNNING" })) };
  const provider = { submitMapTasks: vi.fn(async (requests: unknown[]) => requests.map((_, index) => ({ id: `task-${index}`, costUsd: .0006 }))) };
  const result = await createScan({ locationId: "locations/1", keywordId: "key" }, "MANUAL", { ...options, repo, provider });
  expect(provider.submitMapTasks).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ keyword: "veterinarian", latitude: 28.5, longitude: -81.3 })]));
  expect(repo.saveSubmitted).toHaveBeenCalledWith("scan", expect.arrayContaining([expect.objectContaining({ providerTaskId: "task-0" })]));
  expect(result).toMatchObject({ status: "RUNNING" });
});
