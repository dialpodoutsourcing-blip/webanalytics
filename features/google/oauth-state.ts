import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
const lifetimeSeconds = 10 * 60;

function key(secret: string) {
  return { kty: "oct", k: Buffer.from(secret).toString("base64url") };
}

function digest(state: string) {
  return createHash("sha256").update(state).digest();
}

export async function createOAuthState(secret: string, now = new Date()) {
  const state = randomBytes(32).toString("base64url");
  const issuedAt = Math.floor(now.getTime() / 1000);
  const cookieValue = await new SignJWT({ stateHash: digest(state).toString("base64url") })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + lifetimeSeconds)
    .sign(key(secret));
  return { state, cookieValue };
}

export async function verifyOAuthState(
  cookieValue: string | undefined,
  queryState: string,
  secret: string,
  now = new Date(),
) {
  if (!cookieValue || !queryState) return false;
  try {
    const { payload } = await jwtVerify(cookieValue, key(secret), { currentDate: now });
    if (typeof payload.stateHash !== "string") return false;
    const expected = Buffer.from(payload.stateHash, "base64url");
    const actual = digest(queryState);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
