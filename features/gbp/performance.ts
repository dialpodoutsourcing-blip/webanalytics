import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { getAuthorizedGoogleClient } from "@/features/google/oauth";

const requestSchema = z.object({ locationId: z.string().min(1), startDate: z.iso.date(), endDate: z.iso.date() }).superRefine((value, ctx) => {
  const start = new Date(`${value.startDate}T00:00:00.000Z`); const end = new Date(`${value.endDate}T00:00:00.000Z`);
  if (start > end) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must follow start date" });
  const limit = new Date(start); limit.setUTCMonth(limit.getUTCMonth() + 18);
  if (end > limit) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Date range cannot exceed 18 months" });
});

export type GbpAnalyticsRequest = z.infer<typeof requestSchema>;
type Point = { date: string; value: number };
export type SearchQueryMetric = { keyword: string; impressions: number | null; threshold?: string };
export type GbpAnalyticsReport = { locationId: string; startDate: string; endDate: string; daily: { calls: Point[]; directions: Point[]; websiteClicks: Point[]; impressions: Point[] }; searchQueries: SearchQueryMetric[]; fetchedAt: string };

export function parseGbpAnalyticsRequest(input: unknown) { return requestSchema.parse(input); }

function isoDate(value: { year?: number | null; month?: number | null; day?: number | null }) {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

type DailySeries = { dailyMetric?: string | null; timeSeries?: { datedValues?: Array<{ date?: { year?: number | null; month?: number | null; day?: number | null }; value?: string | number | null }> } };
export function normalizeDailyMetrics(input: { multiDailyMetricTimeSeries?: Array<{ dailyMetricTimeSeries?: DailySeries[] }> }) {
  const result = { calls: [] as Point[], directions: [] as Point[], websiteClicks: [] as Point[], impressions: [] as Point[] };
  const impressionTotals = new Map<string, number>();
  for (const group of input.multiDailyMetricTimeSeries ?? []) for (const series of group.dailyMetricTimeSeries ?? []) {
    const points = (series.timeSeries?.datedValues ?? []).flatMap((entry) => entry.date ? [{ date: isoDate(entry.date), value: Number(entry.value ?? 0) }] : []);
    if (series.dailyMetric === "CALL_CLICKS") result.calls = points;
    else if (series.dailyMetric === "BUSINESS_DIRECTION_REQUESTS") result.directions = points;
    else if (series.dailyMetric === "WEBSITE_CLICKS") result.websiteClicks = points;
    else if (series.dailyMetric?.includes("IMPRESSIONS")) for (const point of points) impressionTotals.set(point.date, (impressionTotals.get(point.date) ?? 0) + point.value);
  }
  result.impressions = [...impressionTotals].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

export type GbpPerformanceClient = { fetchDaily(input: GbpAnalyticsRequest): Promise<unknown>; fetchKeywords(input: GbpAnalyticsRequest): Promise<SearchQueryMetric[]> };
type Cache = { read(input: GbpAnalyticsRequest): Promise<{ report: GbpAnalyticsReport; fresh: boolean } | null>; write(input: GbpAnalyticsRequest, report: GbpAnalyticsReport): Promise<void> };

async function googleRequest(url: URL) {
  const auth = await getAuthorizedGoogleClient(); const tokenValue = await auth.getAccessToken(); const token = typeof tokenValue === "string" ? tokenValue : tokenValue?.token;
  if (!token) throw new AppError("GOOGLE_REAUTH_REQUIRED");
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new AppError(response.status === 401 || response.status === 403 ? "GOOGLE_REAUTH_REQUIRED" : "UPSTREAM_UNAVAILABLE");
  return await response.json() as Record<string, unknown>;
}

const metrics = ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", "CALL_CLICKS", "BUSINESS_DIRECTION_REQUESTS", "WEBSITE_CLICKS"];
const productionClient: GbpPerformanceClient = {
  async fetchDaily(input) {
    const url = new URL(`https://businessprofileperformance.googleapis.com/v1/${input.locationId}:fetchMultiDailyMetricsTimeSeries`);
    for (const metric of metrics) url.searchParams.append("dailyMetrics", metric);
    const start = new Date(`${input.startDate}T00:00:00Z`); const end = new Date(`${input.endDate}T00:00:00Z`);
    for (const [prefix, date] of [["dailyRange.startDate", start], ["dailyRange.endDate", end]] as const) { url.searchParams.set(`${prefix}.year`, String(date.getUTCFullYear())); url.searchParams.set(`${prefix}.month`, String(date.getUTCMonth() + 1)); url.searchParams.set(`${prefix}.day`, String(date.getUTCDate())); }
    return await googleRequest(url);
  },
  async fetchKeywords(input) {
    const values: Array<{ searchKeyword?: string; insightsValue?: { value?: string | number; threshold?: string } }> = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(`https://businessprofileperformance.googleapis.com/v1/${input.locationId}/searchkeywords/impressions/monthly`);
      const start = new Date(`${input.startDate}T00:00:00Z`); const end = new Date(`${input.endDate}T00:00:00Z`);
      url.searchParams.set("monthlyRange.startMonth.year", String(start.getUTCFullYear())); url.searchParams.set("monthlyRange.startMonth.month", String(start.getUTCMonth() + 1));
      url.searchParams.set("monthlyRange.endMonth.year", String(end.getUTCFullYear())); url.searchParams.set("monthlyRange.endMonth.month", String(end.getUTCMonth() + 1));
      url.searchParams.set("pageSize", "100"); if (pageToken) url.searchParams.set("pageToken", pageToken);
      const body = await googleRequest(url); values.push(...((body.searchKeywordsCounts as typeof values | undefined) ?? [])); pageToken = body.nextPageToken as string | undefined;
    } while (pageToken);
    return values.map((entry) => ({ keyword: entry.searchKeyword ?? "", impressions: entry.insightsValue?.value == null ? null : Number(entry.insightsValue.value), threshold: entry.insightsValue?.threshold })).filter((entry) => entry.keyword);
  },
};

const productionCache: Cache = {
  async read(input) {
    const location = await prisma.businessLocation.findUnique({ where: { googleLocationId: input.locationId } }); if (!location) return null;
    const row = await prisma.gbpAnalyticsCache.findUnique({ where: { businessLocationId_reportType_startDate_endDate: { businessLocationId: location.id, reportType: "combined", startDate: new Date(`${input.startDate}T00:00:00Z`), endDate: new Date(`${input.endDate}T00:00:00Z`) } } });
    return row ? { report: JSON.parse(row.payloadJson) as GbpAnalyticsReport, fresh: row.expiresAt > new Date() } : null;
  },
  async write(input, report) {
    const location = await prisma.businessLocation.findUniqueOrThrow({ where: { googleLocationId: input.locationId } }); const fetchedAt = new Date(report.fetchedAt); const expiresAt = new Date(fetchedAt.getTime() + 6 * 60 * 60 * 1000);
    const key = { businessLocationId: location.id, reportType: "combined", startDate: new Date(`${input.startDate}T00:00:00Z`), endDate: new Date(`${input.endDate}T00:00:00Z`) };
    await prisma.gbpAnalyticsCache.upsert({ where: { businessLocationId_reportType_startDate_endDate: key }, create: { ...key, payloadJson: JSON.stringify(report), fetchedAt, expiresAt }, update: { payloadJson: JSON.stringify(report), fetchedAt, expiresAt } });
  },
};

export async function getGbpAnalytics(input: GbpAnalyticsRequest, deps: { client?: GbpPerformanceClient; cache?: Cache; locationExists?: (id: string) => Promise<boolean>; now?: () => Date } = {}) {
  const client = deps.client ?? productionClient; const cache = deps.cache ?? productionCache; const now = deps.now ?? (() => new Date());
  const exists = deps.locationExists ? await deps.locationExists(input.locationId) : Boolean(await prisma.businessLocation.findUnique({ where: { googleLocationId: input.locationId } }));
  if (!exists) throw new AppError("INVALID_INPUT", "Unknown Business Profile location");
  const cached = await cache.read(input); if (cached?.fresh) return { report: cached.report, stale: false };
  try {
    const [dailyRaw, searchQueries] = await Promise.all([client.fetchDaily(input), client.fetchKeywords(input)]);
    const report: GbpAnalyticsReport = { ...input, daily: normalizeDailyMetrics(dailyRaw as Parameters<typeof normalizeDailyMetrics>[0]), searchQueries, fetchedAt: now().toISOString() };
    await cache.write(input, report); return { report, stale: false };
  } catch (error) { if (cached) return { report: cached.report, stale: true }; throw error; }
}
