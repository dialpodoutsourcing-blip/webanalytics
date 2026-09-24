import { google, type Auth } from "googleapis";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { blobConnectionStore, type ConnectionStore } from "./connection-store";
import { decryptToken, encryptToken } from "./token-crypto";

const scope = "https://www.googleapis.com/auth/webmasters.readonly";

type OAuthClient = {
  generateAuthUrl(options: { access_type: "offline"; prompt: "consent"; scope: string[]; state: string }): string;
  getToken(code: string): Promise<{ tokens: { refresh_token?: string | null; scope?: string | null } }>;
  setCredentials(credentials: { refresh_token: string }): void;
};

type OAuthDependencies = {
  store: ConnectionStore;
  createClient: () => OAuthClient;
  encryptionKey: string;
  encrypt: (value: string, key: string) => string;
  decrypt: (value: string, key: string) => string;
  now: () => Date;
};

export function createGoogleOAuthService(deps: OAuthDependencies) {
  return {
    beginGoogleOAuth(state: string) {
      return deps.createClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: [scope], state });
    },
    async finishGoogleOAuth(code: string) {
      const { tokens } = await deps.createClient().getToken(code);
      if (!tokens.refresh_token) throw new AppError("GOOGLE_REAUTH_REQUIRED", "Google did not return a refresh token.");
      let existing = null;
      try { existing = await deps.store.read(); } catch { existing = null; }
      const timestamp = deps.now().toISOString();
      await deps.store.write({
        version: 1,
        refreshTokenEncrypted: deps.encrypt(tokens.refresh_token, deps.encryptionKey),
        ...(tokens.scope ? { scope: tokens.scope } : {}),
        connectedAt: existing?.connectedAt ?? timestamp,
        updatedAt: timestamp,
      });
    },
    async getAuthorizedGoogleClient() {
      const connection = await deps.store.read();
      if (!connection) throw new AppError("GOOGLE_NOT_CONNECTED");
      try {
        const oauth = deps.createClient();
        oauth.setCredentials({ refresh_token: deps.decrypt(connection.refreshTokenEncrypted, deps.encryptionKey) });
        return oauth;
      } catch (cause) {
        throw new AppError("GOOGLE_REAUTH_REQUIRED", undefined, false, { cause });
      }
    },
    async getConnectionStatus() {
      try {
        const connection = await deps.store.read();
        if (!connection) return { connected: false, connectedAt: null, needsAttention: false };
        deps.decrypt(connection.refreshTokenEncrypted, deps.encryptionKey);
        return { connected: true, connectedAt: connection.connectedAt, needsAttention: false };
      } catch {
        let connectedAt: string | null = null;
        try { connectedAt = (await deps.store.read())?.connectedAt ?? null; } catch { /* malformed record */ }
        return { connected: false, connectedAt, needsAttention: true };
      }
    },
  };
}

function productionClient() {
  const env = getEnv();
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_OAUTH_REDIRECT_URI);
}

function productionService() {
  const env = getEnv();
  return createGoogleOAuthService({ store: blobConnectionStore, createClient: productionClient, encryptionKey: env.TOKEN_ENCRYPTION_KEY, encrypt: encryptToken, decrypt: decryptToken, now: () => new Date() });
}

export function beginGoogleOAuth(state: string) { return productionService().beginGoogleOAuth(state); }
export function finishGoogleOAuth(code: string) { return productionService().finishGoogleOAuth(code); }
export async function getAuthorizedGoogleClient(): Promise<Auth.OAuth2Client> { return await productionService().getAuthorizedGoogleClient() as Auth.OAuth2Client; }
export function getConnectionStatus() { return productionService().getConnectionStatus(); }
