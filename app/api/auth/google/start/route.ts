import { beginGoogleOAuth } from "@/features/google/oauth";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/route-auth";
export async function GET() { const denied=await unauthorizedResponse();if(denied)return denied;return NextResponse.redirect(await beginGoogleOAuth()); }
