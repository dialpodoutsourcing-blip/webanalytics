import { finishGoogleOAuth } from "@/features/google/oauth";
import { GOOGLE_OAUTH_STATE_COOKIE, verifyOAuthState } from "@/features/google/oauth-state";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const signedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
  try {
    const state = url.searchParams.get("state") ?? "";
    const code = url.searchParams.get("code") ?? "";
    if (!code || !await verifyOAuthState(signedState, state, getEnv().SESSION_SECRET)) throw new Error("Invalid OAuth response");
    await finishGoogleOAuth(code);
    return NextResponse.redirect(new URL("/settings?connected=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?error=google_connection", request.url));
  }
}
