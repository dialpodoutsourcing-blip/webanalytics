import { listProperties } from "@/features/google/search-console";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
export async function GET() { const denied=await unauthorizedResponse();if(denied)return denied;try { return NextResponse.json({ data: await listProperties() }); } catch { return NextResponse.json({ error: "The shared Google connection is unavailable. Ask the portal owner to reconnect it in Settings." }, { status: 503 }); } }
