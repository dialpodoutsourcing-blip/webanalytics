import { google } from "googleapis";
import { getAuthorizedGoogleClient } from "./oauth";
import { normalizePerformanceRows, normalizePerformanceSummary, parsePerformanceRequest } from "@/features/reports/performance";

export async function listProperties() {
  const api = google.webmasters({ version: "v3", auth: await getAuthorizedGoogleClient() });
  const { data } = await api.sites.list();
  return (data.siteEntry ?? []).map(x => ({ id: x.siteUrl!, label: x.siteUrl!, type: x.siteUrl?.startsWith("sc-domain:") ? "Domain" : "URL prefix", permissionLevel: x.permissionLevel ?? "unknown" }));
}
export async function queryPerformance(input: ReturnType<typeof parsePerformanceRequest>) {
  const api = google.searchconsole({ version: "v1", auth: await getAuthorizedGoogleClient() });
  const dimension = input.hourly ? "hour" : "date";
  const filterGroups = input.filters.length ? [{ groupType: "and", filters: input.filters }] : undefined;
  const common = { startDate: input.startDate, endDate: input.endDate, type: input.searchType, dimensionFilterGroups: filterGroups };
  const [summaryResponse, seriesResponse, rowsResponse] = await Promise.all([
    api.searchanalytics.query({ siteUrl: input.property, requestBody: { ...common, rowLimit: 1 } }),
    api.searchanalytics.query({ siteUrl: input.property, requestBody: { ...common, dimensions: [dimension], rowLimit: 25000, dataState: input.hourly ? "hourly_all" : "all" } }),
    api.searchanalytics.query({ siteUrl: input.property, requestBody: { ...common, dimensions: [input.dimension], rowLimit: input.rowLimit, startRow: input.startRow, dataState: "all" } }),
  ]);
  return {
    summary: normalizePerformanceSummary(summaryResponse.data.rows?.[0]),
    series: normalizePerformanceRows(seriesResponse.data.rows ?? []),
    rows: normalizePerformanceRows(rowsResponse.data.rows ?? []),
    page: Math.floor(input.startRow / input.rowLimit) + 1,
    pageSize: input.rowLimit,
    fetchedAt: new Date().toISOString(),
  };
}
export async function listSitemaps(property: string) {
  const api = google.webmasters({ version: "v3", auth: await getAuthorizedGoogleClient() });
  return (await api.sitemaps.list({ siteUrl: property })).data.sitemap ?? [];
}
export async function inspectUrl(property: string, url: string) {
  const api = google.searchconsole({ version: "v1", auth: await getAuthorizedGoogleClient() });
  return (await api.urlInspection.index.inspect({ requestBody: { siteUrl: property, inspectionUrl: url, languageCode: "en-US" } })).data.inspectionResult;
}
