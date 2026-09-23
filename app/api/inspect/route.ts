import { inspectUrl } from "@/features/google/search-console";
import { urlBelongsToProperty } from "@/features/google/property-url";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
export async function POST(request: Request) { const denied=await unauthorizedResponse();if(denied)return denied;const { property, url } = await request.json(); if (!urlBelongsToProperty(url, property)) return NextResponse.json({ error: "URL does not belong to the selected property." }, { status: 400 }); try { return NextResponse.json({ data: await inspectUrl(property, url) }); } catch { return NextResponse.json({ error: "Unable to inspect this URL." }, { status: 502 }); } }
