import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
import { listStoredBusinessLocations, syncBusinessLocations } from "@/features/gbp/locations";

async function respond(load: () => Promise<unknown>) {
  const denied = await unauthorizedResponse();
  if (denied) return denied;
  try { return NextResponse.json({ data: await load() }); }
  catch { return NextResponse.json({ error: "Business Profile locations are unavailable. Reconnect Google in Settings and try again." }, { status: 503 }); }
}

export async function GET() { return await respond(listStoredBusinessLocations); }
export async function POST() { return await respond(syncBusinessLocations); }
