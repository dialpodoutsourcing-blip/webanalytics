import { prisma } from "@/lib/prisma";
import { getGeoGridEnv } from "@/lib/env";
import { advanceScan, createScan } from "./scans";

type Due = { locationId: string; keywordId: string; pointCount?: number };

function weekStart(now: Date) {
  const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return value;
}

async function productionDue(limit: number, now: Date): Promise<Due[]> {
  const keywords = await prisma.trackedKeyword.findMany({
    where: {
      state: "APPROVED",
      businessLocation: { status: "OPEN", isTrackingActive: true, latitude: { not: null }, longitude: { not: null } },
      scans: { none: { createdAt: { gte: weekStart(now) } } },
    },
    include: { businessLocation: true },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: limit * 4,
  });
  return keywords.map((item) => ({ locationId: item.businessLocation.googleLocationId, keywordId: item.id, pointCount: item.defaultGridSize ** 2 }));
}

export async function runGeoGridSchedule(now = new Date(), deps?: {
  listDue: (limit: number) => Promise<Due[]>;
  create: (input: Due) => Promise<unknown>;
  maxJobs: number;
  maxPoints?: number;
  listPending?: (limit: number) => Promise<string[]>;
  advance?: (id: string) => Promise<unknown>;
}) {
  const env = deps ? null : getGeoGridEnv();
  const maxJobs = deps?.maxJobs ?? env!.GEOGRID_SCHEDULER_MAX_JOBS;
  const maxPoints = deps?.maxPoints ?? env?.GEOGRID_SCHEDULER_MAX_POINTS ?? 500;
  const listPending = deps?.listPending ?? (async (limit: number) => (await prisma.geoGridScan.findMany({ where: { status: { in: ["RUNNING", "SUBMITTING", "FAILED"] }, points: { some: { status: "SUBMITTED" } } }, orderBy: { updatedAt: "asc" }, select: { id: true }, take: limit })).map((scan) => scan.id));
  const advance = deps?.advance ?? advanceScan;
  let advanced = 0, failed = 0;
  for (const id of await listPending(maxJobs)) { try { await advance(id); advanced++; } catch { failed++; } }

  const listDue = deps?.listDue ?? ((limit: number) => productionDue(limit, now));
  const create = deps?.create ?? ((input: Due) => createScan(input, "SCHEDULED"));
  const due = await listDue(maxJobs);
  let created = 0, points = 0, considered = 0;
  for (const input of due) {
    const nextPoints = input.pointCount ?? 49;
    if (created >= maxJobs || points + nextPoints > maxPoints) break;
    considered++;
    try { await create(input); created++; points += nextPoints; } catch { failed++; }
  }
  return { considered, created, advanced, failed, points, ranAt: deps ? undefined : now.toISOString() };
}
