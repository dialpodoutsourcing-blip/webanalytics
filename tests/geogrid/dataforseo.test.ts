import { expect, it, vi } from "vitest";
import { createDataForSeoClient } from "@/features/geogrid/dataforseo";

it("submits coordinate-specific Maps tasks with private Basic auth", async () => {
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    void url; void init;
    return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "task-1", status_code: 20100, cost: .0006 }] }), { status: 200 });
  });
  const client = createDataForSeoClient({ login: "user", password: "pass", fetchImpl: fetchImpl as typeof fetch });
  const result = await client.submitMapTasks([{ keyword: "vet", languageCode: "en", latitude: 28.5, longitude: -81.3, depth: 20 }]);
  expect(result).toEqual([{ id: "task-1", costUsd: .0006 }]);
  expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("/serp/google/maps/task_post"), expect.objectContaining({ headers: expect.objectContaining({ authorization: `Basic ${btoa("user:pass")}` }) }));
  expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))[0].location_coordinate).toBe("28.5,-81.3,15z");
});
