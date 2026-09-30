"use client";
import { useState } from "react";

export type KeywordView = { id: string; displayKeyword: string; source: "GBP_SUGGESTED" | "MANUAL"; state: "SUGGESTED" | "APPROVED" | "PAUSED"; impressions?: number };

export function KeywordManager({ keywords, onAdd, onUpdate }: { keywords: KeywordView[]; onAdd: (keyword: string) => void; onUpdate: (id: string, state: "APPROVED" | "PAUSED") => void }) {
  const [value, setValue] = useState("");
  return <div className="keyword-manager"><form onSubmit={(event) => { event.preventDefault(); if (value.trim()) { onAdd(value); setValue(""); } }}><label>Add tracked keyword<input aria-label="Add tracked keyword" value={value} onChange={(event) => setValue(event.target.value)} maxLength={200}/></label><button>Add keyword</button></form>
    <ul>{keywords.map((keyword) => <li key={keyword.id}><span><b>{keyword.displayKeyword}</b>{keyword.impressions !== undefined && <small>{keyword.impressions} impressions</small>}</span>{keyword.state === "SUGGESTED" ? <button aria-label={`Approve ${keyword.displayKeyword}`} onClick={() => onUpdate(keyword.id, "APPROVED")}>Approve</button> : keyword.state === "APPROVED" ? <button aria-label={`Pause ${keyword.displayKeyword}`} onClick={() => onUpdate(keyword.id, "PAUSED")}>Pause</button> : <button aria-label={`Reactivate ${keyword.displayKeyword}`} onClick={() => onUpdate(keyword.id, "APPROVED")}>Reactivate</button>}</li>)}</ul>
  </div>;
}
