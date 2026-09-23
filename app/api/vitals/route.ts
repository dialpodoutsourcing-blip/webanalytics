import { getCrux } from "@/features/google/crux";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
export async function POST(request: Request) { const denied=await unauthorizedResponse();if(denied)return denied;try { const { value, mode } = await request.json(); return NextResponse.json({ data: await getCrux(value, mode) }); } catch { return NextResponse.json({ error: "Unable to load Core Web Vitals." }, { status: 502 }); } }
