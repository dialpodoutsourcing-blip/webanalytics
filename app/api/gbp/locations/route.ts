import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
import { listStoredBusinessLocations, syncBusinessLocations } from "@/features/gbp/locations";

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
  return await respond(syncBusinessLocations, {
    logMessage: "GBP location synchronization failed",
    userMessage: "Business Profile synchronization failed. Check the Google connection and try again.",
  });
}
