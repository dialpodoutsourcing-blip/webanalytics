import { z } from "zod";

const schema = z.object({
  property: z.string().min(1), startDate: z.iso.date(), endDate: z.iso.date(),
  dimension: z.enum(["query", "page", "country", "device", "searchAppearance", "date"]),
  rowLimit: z.coerce.number().int().positive().max(1000).default(1000),
  startRow: z.coerce.number().int().nonnegative().default(0),
  searchType: z.enum(["web", "image", "video", "news", "discover", "googleNews"]).default("web"),
  hourly: z.boolean().default(false),
  filters: z.array(z.object({
    dimension: z.enum(["query", "page", "country", "device"]),
    operator: z.enum(["equals", "notEquals", "contains", "notContains", "includingRegex", "excludingRegex"]),
    expression: z.string().min(1).max(500),
  })).max(5).default([]),
}).refine(v => v.startDate <= v.endDate, { message: "Start date must not follow end date" });
export function parsePerformanceRequest(value: unknown) {
  const input = value as Record<string, unknown>;
  return schema.parse({ ...input, rowLimit: Math.min(Number(input.rowLimit ?? 1000), 1000) });
}
export function normalizePerformanceRows(rows: Array<{ keys?: string[] | null; clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null }> = []) {
  return rows.map(row => ({ key: row.keys?.join(" · ") ?? "Unknown", clicks: row.clicks ?? 0, impressions: row.impressions ?? 0, ctr: row.ctr ?? 0, position: row.position ?? 0 }));
}

export function normalizePerformanceSummary(row?: { clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null }) {
  return { clicks: row?.clicks ?? 0, impressions: row?.impressions ?? 0, ctr: row?.ctr ?? 0, position: row?.position ?? 0 };
}

export type DatePreset = "24h" | "7d" | "28d" | "3m";
export function buildDateRange(preset: DatePreset, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  const days = preset === "24h" ? 1 : preset === "7d" ? 6 : preset === "28d" ? 27 : 89;
  start.setUTCDate(start.getUTCDate() - days);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), hourly: preset === "24h" };
}
