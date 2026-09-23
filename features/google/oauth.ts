import { createHash, randomBytes } from "node:crypto";
import { google } from "googleapis";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "./token-crypto";
import { AppError } from "@/lib/errors";

const scope = "https://www.googleapis.com/auth/webmasters.readonly";
function client() { const e = getEnv(); return new google.auth.OAuth2(e.GOOGLE_CLIENT_ID, e.GOOGLE_CLIENT_SECRET, e.GOOGLE_OAUTH_REDIRECT_URI); }
export async function beginGoogleOAuth() {
  const state = randomBytes(32).toString("base64url");
  await prisma.oAuthState.create({ data: { stateHash: createHash("sha256").update(state).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
  return client().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: [scope], state });
}
export async function finishGoogleOAuth(code: string, state: string) {
  const hash = createHash("sha256").update(state).digest("hex");
  const saved = await prisma.oAuthState.findUnique({ where: { stateHash: hash } });
  await prisma.oAuthState.deleteMany({ where: { stateHash: hash } });
  if (!saved || saved.expiresAt < new Date()) throw new AppError("INVALID_INPUT", "Invalid OAuth state");
  const oauth = client(); const { tokens } = await oauth.getToken(code); const e = getEnv();
  const existing = await prisma.googleConnection.findFirst();
  const refresh = tokens.refresh_token ? encryptToken(tokens.refresh_token, e.TOKEN_ENCRYPTION_KEY) : existing?.refreshTokenEncrypted;
  const data = { accessTokenEncrypted: tokens.access_token ? encryptToken(tokens.access_token, e.TOKEN_ENCRYPTION_KEY) : null, refreshTokenEncrypted: refresh, scope: tokens.scope, tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null };
  if (existing) await prisma.googleConnection.update({ where: { id: existing.id }, data }); else await prisma.googleConnection.create({ data });
}
export async function getAuthorizedGoogleClient() {
  const connection = await prisma.googleConnection.findFirst();
  if (!connection?.refreshTokenEncrypted) throw new AppError("GOOGLE_NOT_CONNECTED");
  const oauth = client(); oauth.setCredentials({ refresh_token: decryptToken(connection.refreshTokenEncrypted, getEnv().TOKEN_ENCRYPTION_KEY) }); return oauth;
}
export async function getConnectionStatus() { const c = await prisma.googleConnection.findFirst(); return { connected: Boolean(c?.refreshTokenEncrypted), connectedAt: c?.connectedAt ?? null }; }
