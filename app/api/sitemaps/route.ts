import { listSitemaps } from "@/features/google/search-console";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
export async function POST(request: Request) { const denied=await unauthorizedResponse();if(denied)return denied;try { const { property } = await request.json(); return NextResponse.json({ data: await listSitemaps(property) }); } catch { return NextResponse.json({ error: "Unable to load sitemaps." }, { status: 400 }); } }
