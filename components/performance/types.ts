export type MetricKey = "clicks" | "impressions" | "ctr" | "position";
export type Dimension = "query" | "page" | "country" | "device" | "searchAppearance" | "date";
export type ReportRow = { key: string; clicks: number; impressions: number; ctr: number; position: number };
export type ReportData = {
  summary: Omit<ReportRow, "key">;
  series: ReportRow[];
  rows: ReportRow[];
  page: number;
  pageSize: number;
  fetchedAt: string;
};
