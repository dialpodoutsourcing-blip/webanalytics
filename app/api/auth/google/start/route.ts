import { beginGoogleOAuth } from "@/features/google/oauth";
import { createOAuthState, GOOGLE_OAUTH_STATE_COOKIE } from "@/features/google/oauth-state";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { unauthorizedResponse } from "@/lib/route-auth";
import { getEnv } from "@/lib/env";

export async function GET() {
  const denied = await unauthorizedResponse();
  if (denied) return denied;
  const env = getEnv();
  const { state, cookieValue } = await createOAuthState(env.SESSION_SECRET);
  (await cookies()).set(GOOGLE_OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 600,
    path: "/api/auth/google/callback",
  });
  return NextResponse.redirect(beginGoogleOAuth(state));
}
