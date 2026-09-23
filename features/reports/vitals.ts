type CruxMetric = { percentiles?: { p75?: number | string }; histogram?: Array<{ start?: number; end?: number; density?: number }> };
type CruxRecord = { metrics?: Record<string, CruxMetric> };
const definitions = {
  largest_contentful_paint: { name: "LCP", unit: "ms", good: 2500, poor: 4000 },
  interaction_to_next_paint: { name: "INP", unit: "ms", good: 200, poor: 500 },
  cumulative_layout_shift: { name: "CLS", unit: "", good: .1, poor: .25 },
} as const;
export function normalizeCruxResponse(record: CruxRecord | null) {
  if (!record?.metrics) return { status: "insufficient-data" as const, metrics: [] };
  const metrics = Object.entries(definitions).flatMap(([key, def]) => {
    const metric = record.metrics?.[key];
    if (metric?.percentiles?.p75 == null) return [];
    const value = Number(metric.percentiles.p75);
    return [{ name: def.name, value, unit: def.unit, rating: value <= def.good ? "good" : value <= def.poor ? "needs-improvement" : "poor", goodDensity: metric.histogram?.[0]?.density ?? 0 }];
  });
  return metrics.length ? { status: "available" as const, metrics } : { status: "insufficient-data" as const, metrics: [] };
}
