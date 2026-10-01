import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
import { listStoredBusinessLocations, syncBusinessLocations } from "@/features/gbp/locations";
import { GbpProviderError } from "@/features/gbp/client";

async function respond(load: () => Promise<unknown>, failure: { logMessage: string; userMessage: string }) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;
  try { return NextResponse.json({ data: await load() }); }
  catch (cause) {
    console.error(failure.logMessage, cause);
    return NextResponse.json({ error: failure.userMessage }, { status: 503 });
  }
}

export async function GET() {
  return await respond(listStoredBusinessLocations, {
    logMessage: "GBP stored-location read failed",
    userMessage: "Saved Business Profile locations are temporarily unavailable.",
  });
}

export async function POST() {
  const denied = await unauthorizedResponse();
  if (denied) return denied;
  try { return NextResponse.json({ data: await syncBusinessLocations() }); }
  catch (cause) {
    console.error("GBP location synchronization failed", cause);
    const providerCause = cause instanceof Error && cause.cause instanceof GbpProviderError ? cause.cause : null;
    return NextResponse.json({
      error: providerCause
        ? `Google Business Profile request failed: ${providerCause.message}`
        : "Business Profile synchronization failed. Check the Google connection and try again.",
    }, { status: 503 });
  }
}
