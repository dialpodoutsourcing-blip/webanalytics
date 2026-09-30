import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export function normalizeKeyword(value: string) { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase(); }

export const createKeywordInput = z.object({ locationId: z.string().min(1), keyword: z.string().trim().min(1).max(200), source: z.enum(["GBP_SUGGESTED", "MANUAL"]).default("MANUAL") });
export const updateKeywordInput = z.object({ id: z.string().min(1), state: z.enum(["APPROVED", "PAUSED"]) });

export async function listLocationKeywords(locationId: string) {
  const location = await prisma.businessLocation.findUnique({ where: { googleLocationId: locationId } });
  if (!location) throw new AppError("INVALID_INPUT");
  return await prisma.trackedKeyword.findMany({ where: { businessLocationId: location.id }, orderBy: [{ state: "asc" }, { displayKeyword: "asc" }] });
}

export async function createKeyword(input: z.infer<typeof createKeywordInput>) {
  const value = createKeywordInput.parse(input); const location = await prisma.businessLocation.findUnique({ where: { googleLocationId: value.locationId } });
  if (!location) throw new AppError("INVALID_INPUT");
  const normalizedKeyword = normalizeKeyword(value.keyword); const state = value.source === "MANUAL" ? "APPROVED" : "SUGGESTED";
  return await prisma.trackedKeyword.upsert({
    where: { businessLocationId_normalizedKeyword: { businessLocationId: location.id, normalizedKeyword } },
    create: { businessLocationId: location.id, displayKeyword: value.keyword.trim(), normalizedKeyword, source: value.source, state },
    update: { displayKeyword: value.keyword.trim() },
  });
}

export async function updateKeyword(input: z.infer<typeof updateKeywordInput>) {
  const value = updateKeywordInput.parse(input); return await prisma.trackedKeyword.update({ where: { id: value.id }, data: { state: value.state } });
}

export async function mergeSuggestedKeywords(locationId: string, suggestions: Array<{ keyword: string; impressions: number }>) {
  return await Promise.all(suggestions.map(async (suggestion) => ({ ...(await createKeyword({ locationId, keyword: suggestion.keyword, source: "GBP_SUGGESTED" })), impressions: suggestion.impressions })));
}
