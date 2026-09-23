import { finishGoogleOAuth } from "@/features/google/oauth";
import { NextResponse } from "next/server";
export async function GET(request: Request) { const u = new URL(request.url); await finishGoogleOAuth(u.searchParams.get("code") ?? "", u.searchParams.get("state") ?? ""); return NextResponse.redirect(new URL("/settings?connected=1", request.url)); }
