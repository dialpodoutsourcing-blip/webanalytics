"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { LocationOption } from "../location-picker";
import { ScanControls } from "./scan-controls";
import { ScanSummary } from "./scan-summary";
import { GeoGridTable, type GridViewPoint } from "./geogrid-table";

const GeoGridMap = dynamic(() => import("./geogrid-map"), { ssr: false });
type Keyword = { id: string; displayKeyword: string; state: string; defaultGridSize: number; radiusKm: number };
type Scan = { id: string; status: string; keyword?: string; createdAt?: string; gridSize?: number; radiusKm?: number; estimatedCostUsd?: number; actualCostUsd?: number; metrics?: { averageRank: number | null; top3Coverage: number | null; top10Coverage: number | null; visibility: number | null; completionRate: number }; points?: GridViewPoint[] };
type History = { id: string; keyword: string; status: string; createdAt: string };

export function GeoGridWorkspace() {
  const [locations, setLocations] = useState<LocationOption[]>([]), [locationId, setLocationId] = useState(""), [keywords, setKeywords] = useState<Keyword[]>([]), [keywordId, setKeywordId] = useState(""), [gridSize, setGridSize] = useState(7), [radiusKm, setRadiusKm] = useState(2), [history, setHistory] = useState<History[]>([]), [scan, setScan] = useState<Scan>(), [compareTo, setCompareTo] = useState(""), [error, setError] = useState("");
  async function syncLocations() { const response = await fetch("/api/gbp/locations", { method: "POST" }); const value = await response.json(); if (!response.ok) throw new Error(value.error); setLocations(value.data ?? []); }
  useEffect(() => { const controller = new AbortController(); fetch("/api/gbp/locations", { signal: controller.signal }).then((r) => r.json()).then((v) => setLocations(v.data ?? [])).catch((cause) => { if (cause.name !== "AbortError") setError("Unable to load locations."); }); return () => controller.abort(); }, []);
  useEffect(() => { if (!locationId) return; const controller = new AbortController(); Promise.all([fetch(`/api/gbp/keywords?locationId=${encodeURIComponent(locationId)}`, { signal: controller.signal }).then((r) => r.json()), fetch(`/api/geogrid/scans?locationId=${encodeURIComponent(locationId)}`, { signal: controller.signal }).then((r) => r.json())]).then(([keywordValue, historyValue]) => { setKeywords(keywordValue.data ?? []); setHistory(historyValue.data ?? []); }).catch((cause) => { if (cause.name !== "AbortError") setError("Unable to load local SEO data."); }); return () => controller.abort(); }, [locationId]);
  useEffect(() => { if (!scan || !["QUEUED", "SUBMITTING", "RUNNING"].includes(scan.status)) return; let cancelled = false; const timer = setTimeout(async () => { try { const response = await fetch(`/api/geogrid/scans/${scan.id}`), value = await response.json(); if (!response.ok) throw new Error(value.error); if (!cancelled) setScan(value.data); } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to refresh scan."); } }, 2000); return () => { cancelled = true; clearTimeout(timer); }; }, [scan]);
  function selectLocation(value: string) { setLocationId(value); setKeywordId(""); setKeywords([]); setHistory([]); setScan(undefined); setCompareTo(""); setError(""); }
  function selectKeyword(value: string) { setKeywordId(value); const keyword = keywords.find((item) => item.id === value); if (keyword) { setGridSize(keyword.defaultGridSize); setRadiusKm(keyword.radiusKm); } setScan(undefined); }
  async function openScan(id: string, previous = compareTo) { const suffix = previous && previous !== id ? `?compareTo=${encodeURIComponent(previous)}` : ""; const response = await fetch(`/api/geogrid/scans/${id}${suffix}`), value = await response.json(); if (!response.ok) throw new Error(value.error); setScan(value.data); }
  async function run() { setError(""); try { const response = await fetch("/api/geogrid/scans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locationId, keywordId, gridSize, radiusKm }) }), value = await response.json(); if (!response.ok) throw new Error(value.error); setScan(value.data); await openScan(value.data.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to run scan."); } }
  async function retry() { if (!scan) return; const response = await fetch(`/api/geogrid/scans/${scan.id}`, { method: "POST" }), value = await response.json(); if (!response.ok) { setError(value.error); return; } setScan(value.data); }
  const points = scan?.points ?? [];
  return <div className="local-seo-workspace">
    {!locations.length && <button onClick={() => void syncLocations().catch((cause) => setError(cause.message))}>Synchronize GBP locations</button>}
    <ScanControls locations={locations} locationId={locationId} onLocation={selectLocation} keywords={keywords} keywordId={keywordId} onKeyword={selectKeyword} gridSize={gridSize} onGridSize={setGridSize} radiusKm={radiusKm} onRadius={setRadiusKm} onRun={run} running={Boolean(scan && ["QUEUED", "SUBMITTING", "RUNNING"].includes(scan.status))}/>
    {history.length > 0 && <div className="local-controls"><label>Scan history<select aria-label="Scan history" value={scan?.id ?? ""} onChange={(event) => void openScan(event.target.value)}><option value="">Choose a saved scan</option>{history.map((item) => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleDateString()} - {item.keyword} ({item.status.toLowerCase()})</option>)}</select></label><label>Compare with<select aria-label="Compare with scan" value={compareTo} onChange={(event) => { setCompareTo(event.target.value); if(scan) void openScan(scan.id,event.target.value); }}><option value="">No comparison</option>{history.filter((item) => item.id !== scan?.id).map((item) => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleDateString()} - {item.keyword}</option>)}</select></label></div>}
    {error && <div className="state state-error"><strong>Geo-grid unavailable</strong><span>{error}</span></div>}
    {!scan && <p className="notice">Select an open location and approved keyword. A paid scan runs only after you press Run new scan.</p>}
    {scan && <p className="notice">{scan.keyword} · {scan.gridSize} by {scan.gridSize} · {scan.radiusKm} km · actual cost ${(scan.actualCostUsd ?? 0).toFixed(4)}</p>}
    {scan && ["PARTIAL", "FAILED"].includes(scan.status) && <button onClick={() => void retry()}>Retry incomplete points</button>}
    {scan?.metrics && <ScanSummary metrics={scan.metrics}/>} {points.length > 0 && <><GeoGridMap points={points}/><GeoGridTable points={points}/></>}
  </div>;
}
