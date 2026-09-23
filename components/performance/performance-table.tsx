"use client";
import { useMemo, useState } from "react";
import type { MetricKey, ReportRow } from "./types";

const labels: Record<string,string>={query:"Query",page:"Page",country:"Country",device:"Device",searchAppearance:"Search appearance",date:"Date"};
export function PerformanceTable({ rows, dimension, onNext, onPrevious, page }: { rows: ReportRow[]; dimension: string; onNext:()=>void;onPrevious:()=>void;page:number }) {
  const [sort,setSort]=useState<MetricKey>("clicks"); const [descending,setDescending]=useState(true);
  const sorted=useMemo(()=>[...rows].sort((a,b)=>(a[sort]-b[sort])*(descending?-1:1)),[rows,sort,descending]);
  function choose(key:MetricKey){if(sort===key)setDescending(v=>!v);else{setSort(key);setDescending(true)}}
  return <><div className="table-scroll"><table className="performance-data"><thead><tr><th>{labels[dimension]??dimension}</th>{(["clicks","impressions","ctr","position"] as MetricKey[]).map(k=><th key={k}><button onClick={()=>choose(k)}>{k==="ctr"?"CTR":k[0].toUpperCase()+k.slice(1)} {sort===k?(descending?"↓":"↑"):""}</button></th>)}</tr></thead><tbody>{sorted.map((r,i)=><tr key={`${r.key}-${i}`}><td title={r.key}>{r.key}</td><td>{r.clicks.toLocaleString()}</td><td>{r.impressions.toLocaleString()}</td><td>{(r.ctr*100).toFixed(1)}%</td><td>{r.position.toFixed(1)}</td></tr>)}</tbody></table></div><div className="pager"><span>Page {page}</span><div><button disabled={page<=1} onClick={onPrevious}>Previous</button><button disabled={rows.length===0} onClick={onNext}>Next</button></div></div></>;
}
