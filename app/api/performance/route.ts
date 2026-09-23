import { queryPerformance } from "@/features/google/search-console";
import { parsePerformanceRequest } from "@/features/reports/performance";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
export async function POST(request: Request) { const denied=await unauthorizedResponse();if(denied)return denied;try { const input = parsePerformanceRequest(await request.json()); return NextResponse.json({ data: await queryPerformance(input) }); } catch { return NextResponse.json({ error: "Unable to load performance data." }, { status: 400 }); } }
