import { clearPortalSession } from "@/features/auth/session";
import { NextResponse } from "next/server";
export async function POST(request: Request) { await clearPortalSession(); return NextResponse.redirect(new URL("/login", request.url), 303); }
