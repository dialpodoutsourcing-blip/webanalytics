import { NextResponse } from "next/server";
import { verifyPortalCredentials } from "@/features/auth/credentials";
import { createPortalSession } from "@/features/auth/session";
import { getEnv } from "@/lib/env";
export async function POST(request: Request) {
  const body = await request.json(); const e = getEnv();
  if (!verifyPortalCredentials(body.username ?? "", body.password ?? "", { username: e.PORTAL_USERNAME, password: e.PORTAL_PASSWORD })) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  await createPortalSession(); return NextResponse.json({ ok: true });
}
