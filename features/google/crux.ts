import { getEnv } from "@/lib/env";
import { normalizeCruxResponse } from "@/features/reports/vitals";
export async function getCrux(value: string, mode: "origin" | "url" = "origin") {
  const response = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(getEnv().GOOGLE_CRUX_API_KEY)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ [mode]: value }) });
  if (response.status === 404) return normalizeCruxResponse(null);
  if (!response.ok) throw new Error(`CrUX request failed (${response.status})`);
  const data = await response.json(); return normalizeCruxResponse(data.record ?? null);
}
