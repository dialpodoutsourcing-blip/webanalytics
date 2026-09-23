"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PropertyPicker } from "@/components/dashboard-client";
import { ReportState } from "@/components/report-state";
import { buildDateRange, type DatePreset } from "@/features/reports/performance";
import { PerformanceChart } from "./performance-chart";
import { PerformanceTable } from "./performance-table";
import type { Dimension, MetricKey, ReportData } from "./types";

const metrics: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: "clicks", label: "Total clicks", color: "blue" },
  { key: "impressions", label: "Total impressions", color: "purple" },
  { key: "ctr", label: "Average CTR", color: "green" },
  { key: "position", label: "Average position", color: "orange" },
];
const tabs: Array<{ key: Dimension; label: string; tooltip: string }> = [
  { key: "query", label: "Queries", tooltip: "Search terms people used to find your website." },
  { key: "page", label: "Pages", tooltip: "Website pages that appeared in Google Search." },
  { key: "country", label: "Countries", tooltip: "Countries where people searched before seeing your website." },
  { key: "device", label: "Devices", tooltip: "Performance grouped by desktop, mobile, or tablet." },
  { key: "searchAppearance", label: "Search appearance", tooltip: "Special result formats such as rich results, videos, and other search features." },
  { key: "date", label: "Dates", tooltip: "Daily performance across the selected reporting period." },
];
type Filter = { dimension: "query" | "page" | "country" | "device"; operator: "contains" | "equals"; expression: string };

export function PerformanceReport() {
  const [property, setProperty] = useState("");
  const [preset, setPreset] = useState<DatePreset>("3m");
  const [dimension, setDimension] = useState<Dimension>("query");
  const [searchType, setSearchType] = useState("web");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportData>();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const requestId = useRef(0);
  const dates = useMemo(() => buildDateRange(preset), [preset]);

  const load = useCallback(async () => {
    if (!property) return;
    const id = ++requestId.current;
    setState("loading");
    try {
      const response = await fetch("/api/performance", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ property, ...dates, dimension, searchType, filters, rowLimit: 250, startRow: (page - 1) * 250, hourly: dates.hourly }),
      });
      const body = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok) throw new Error(body.error);
      setData(body.data); setState("idle");
    } catch { if (id === requestId.current) setState("error"); }
  }, [property, dates, dimension, searchType, filters, page]);
  // Loading is intentionally synchronized to the active report controls.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function addFilter() { const expression = window.prompt("Enter a query to filter by"); if (expression) setFilters(current => [...current, { dimension: "query", operator: "contains", expression }]); }
  function exportCsv() {
    if (!data) return;
    const csv = [[dimension, "Clicks", "Impressions", "CTR", "Position"], ...data.rows.map(r => [r.key, r.clicks, r.impressions, r.ctr, r.position])].map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = `performance-${dimension}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href);
  }
  const value = (key: MetricKey) => !data ? "—" : key === "ctr" ? `${(data.summary.ctr * 100).toFixed(1)}%` : key === "position" ? data.summary.position.toFixed(1) : data.summary[key].toLocaleString();

  return <div className="performance-report">
    <div className="performance-toolbar"><PropertyPicker onChange={selected => { setProperty(selected); setPage(1); }}/><div className="toolbar-row"><div className="segmented">{([ ["24h", "24 hours"], ["7d", "7 days"], ["28d", "28 days"], ["3m", "3 months"] ] as Array<[DatePreset, string]>).map(([key, label]) => <button className={preset === key ? "active" : ""} key={key} onClick={() => { setPreset(key); setPage(1); }}>{preset === key && "✓ "}{label}</button>)}</div><select aria-label="Search type" value={searchType} onChange={event => setSearchType(event.target.value)}><option value="web">Search type: Web</option><option value="image">Search type: Image</option><option value="video">Search type: Video</option><option value="news">Search type: News</option></select><button className="filter-button" onClick={addFilter}>＋ Add filter</button><button className="export-button" onClick={exportCsv} disabled={!data}>⇩ Export</button></div>{filters.length > 0 && <div className="filter-chips">{filters.map((filter, index) => <button key={index} onClick={() => setFilters(items => items.filter((_, itemIndex) => itemIndex !== index))}>{filter.dimension}: {filter.expression} ×</button>)}</div>}</div>
    {!property && <ReportState kind="empty" title="Select a property" message="Choose a Search Console property to explore its performance."/>}
    {state === "loading" && <ReportState kind="loading" title="Loading performance" message="Fetching fresh Search Console data…"/>}
    {state === "error" && <ReportState kind="error" title="Unable to load performance" message="Check the Google connection and try again."/>}
    <div className="performance-surface"><div className="metric-toggle-grid">{metrics.map(metric => { const charted=metric.key==="clicks"||metric.key==="impressions";return <div key={metric.key} className={`metric-toggle ${metric.color} ${charted?"selected":""}`}><span><i>{charted?"✓":""}</i>{metric.label}</span><strong>{value(metric.key)}</strong></div>})}</div><div className="chart-grouping"><span>Performance over time</span><strong>{dates.hourly ? "Hourly" : "Daily"}</strong></div><PerformanceChart rows={data?.series ?? []}/><div className="freshness">{data ? `Updated ${new Date(data.fetchedAt).toLocaleString()}` : "Waiting for a property selection"}</div></div>
    <div className="performance-table-card"><div className="dimension-tabs" role="tablist">{tabs.map(tab => <button title={tab.tooltip} aria-label={tab.label} role="tab" aria-selected={dimension === tab.key} className={dimension === tab.key ? "active" : ""} key={tab.key} onClick={() => { setDimension(tab.key); setPage(1); }}>{tab.label}</button>)}</div>{data?.rows.length ? <PerformanceTable rows={data.rows} dimension={dimension} page={page} onPrevious={() => setPage(current => Math.max(1, current - 1))} onNext={() => setPage(current => current + 1)}/> : <ReportState kind="empty" title="No table data yet" message="Select a property or adjust the active filters."/>}</div>
  </div>;
}
