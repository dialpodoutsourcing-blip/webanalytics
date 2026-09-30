import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { unauthorizedResponse } from "@/lib/route-auth";
import { getGbpAnalytics, parseGbpAnalyticsRequest } from "@/features/gbp/performance";
import { AppError, toPublicError } from "@/lib/errors";

export async function GET(request: Request) {
  const denied = await unauthorizedResponse(); if (denied) return denied;
  try {
    const url = new URL(request.url); const input = parseGbpAnalyticsRequest(Object.fromEntries(url.searchParams)); const result = await getGbpAnalytics(input);
    return NextResponse.json({ data: result.report, ...(result.stale ? { stale: true } : {}) });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : error instanceof AppError && error.code === "INVALID_INPUT" ? 404 : 503;
    return NextResponse.json({ error: error instanceof ZodError ? "Check the location and date range." : toPublicError(error).message }, { status });
  }
}
