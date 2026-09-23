import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

const name = "portal_session";
const secret = () => new TextEncoder().encode(getEnv().SESSION_SECRET);
export async function createPortalSession() {
  const token = await new SignJWT({ authenticated: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
  (await cookies()).set(name, token, { httpOnly: true, sameSite: "lax", secure: getEnv().NODE_ENV === "production", path: "/", maxAge: 28800 });
}
export async function readPortalSession() {
  const token = (await cookies()).get(name)?.value;
  if (!token) return false;
  try { const { payload } = await jwtVerify(token, secret()); return payload.authenticated === true; } catch { return false; }
}
export async function clearPortalSession() { (await cookies()).delete(name); }
