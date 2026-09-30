import { AppError } from "@/lib/errors";

export type MapTaskRequest = { keyword: string; languageCode: string; latitude: number; longitude: number; depth: number };
export type SubmittedTask = { id: string; costUsd: number };
export type ProviderTaskResult = { id: string; costUsd: number; status: "COMPLETE" | "RUNNING" | "FAILED"; items: Array<Record<string, unknown>>; failureCode?: string };
export type DataForSeoClient = {
  submitMapTasks(requests: MapTaskRequest[]): Promise<SubmittedTask[]>;
  getMapTasks(ids: string[]): Promise<ProviderTaskResult[]>;
};

type ApiTask = {
  id?: string;
  cost?: number;
  status_code?: number;
  status_message?: string;
  result?: Array<{ items?: Array<Record<string, unknown>> }>;
};

export function createDataForSeoClient(config: { login: string; password: string; fetchImpl: typeof fetch }): DataForSeoClient {
  const authorization = `Basic ${btoa(`${config.login}:${config.password}`)}`;

  async function request(path: string, init?: RequestInit): Promise<ApiTask[]> {
    const response = await config.fetchImpl(`https://api.dataforseo.com/v3${path}`, {
      ...init,
      headers: { authorization, ...(init?.body ? { "content-type": "application/json" } : {}) },
    });
    if (!response.ok) throw new AppError("UPSTREAM_UNAVAILABLE");
    const payload = await response.json() as { status_code?: number; tasks?: ApiTask[] };
    if (payload.status_code !== 20000) throw new AppError(payload.status_code === 40200 ? "QUOTA_EXCEEDED" : "UPSTREAM_UNAVAILABLE");
    return payload.tasks ?? [];
  }

  return {
    async submitMapTasks(requests) {
      if (!requests.length || requests.length > 100) throw new AppError("INVALID_INPUT");
      const tasks = await request("/serp/google/maps/task_post", {
        method: "POST",
        body: JSON.stringify(requests.map((item) => ({
          keyword: item.keyword,
          language_code: item.languageCode,
          location_coordinate: `${item.latitude},${item.longitude},15z`,
          depth: item.depth,
          tag: `${item.latitude}:${item.longitude}`,
        }))),
      });
      if (tasks.length !== requests.length || tasks.some((task) => !task.id || ![20000, 20100].includes(Number(task.status_code)))) {
        throw new AppError("UPSTREAM_UNAVAILABLE");
      }
      return tasks.map((task) => ({ id: task.id!, costUsd: Number(task.cost ?? 0) }));
    },

    async getMapTasks(ids) {
      return await Promise.all(ids.map(async (id) => {
        const task = (await request(`/serp/google/maps/task_get/advanced/${encodeURIComponent(id)}`))[0];
        if (!task) return { id, costUsd: 0, status: "RUNNING" as const, items: [] };
        const code = Number(task.status_code ?? 0);
        if (code === 40601 || code === 40602) return { id, costUsd: Number(task.cost ?? 0), status: "RUNNING" as const, items: [] };
        if (code !== 20000) return { id, costUsd: Number(task.cost ?? 0), status: "FAILED" as const, items: [], failureCode: String(code || "UNKNOWN") };
        return { id, costUsd: Number(task.cost ?? 0), status: "COMPLETE" as const, items: task.result?.[0]?.items ?? [] };
      }));
    },
  };
}
