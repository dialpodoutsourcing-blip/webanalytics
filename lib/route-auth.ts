import { readPortalSession } from "@/features/auth/session";
import { NextResponse } from "next/server";
export async function unauthorizedResponse() { return await readPortalSession() ? null : NextResponse.json({ error: "Please sign in to continue." }, { status: 401 }); }
