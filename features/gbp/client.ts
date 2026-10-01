import type { Auth } from "googleapis";
import { AppError } from "@/lib/errors";
import { getAuthorizedGoogleClient } from "@/features/google/oauth";
import type { GbpClient } from "./types";

type ClientDependencies = {
  getAuth: () => Promise<Auth.OAuth2Client>;
  fetchImpl: typeof fetch;
};

export class GbpProviderError extends Error {
  constructor(
    public status: number,
    public googleCode: number | null,
    public googleStatus: string | null,
    message: string,
  ) {
    super(message);
    this.name = "GbpProviderError";
  }
}

type GoogleErrorPayload = { error?: { code?: unknown; status?: unknown; message?: unknown } };

async function providerError(response: Response) {
  let payload: GoogleErrorPayload = {};
  try { payload = await response.json() as GoogleErrorPayload; } catch { /* Google did not return JSON */ }
  const detail = payload.error;
  const message = typeof detail?.message === "string" ? detail.message.slice(0, 500) : `Google Business Profile returned HTTP ${response.status}.`;
  return new GbpProviderError(
    response.status,
    typeof detail?.code === "number" ? detail.code : null,
    typeof detail?.status === "string" ? detail.status : null,
    message,
  );
}

async function accessToken(auth: Auth.OAuth2Client) {
  const value = await auth.getAccessToken();
  const token = typeof value === "string" ? value : value?.token;
  if (!token) throw new AppError("GOOGLE_REAUTH_REQUIRED");
  return token;
}

export function createGbpClient(deps: ClientDependencies): GbpClient {
  async function request<T>(url: URL): Promise<T> {
    const auth = await deps.getAuth();
    const response = await deps.fetchImpl(url, { headers: { authorization: `Bearer ${await accessToken(auth)}`, "x-goog-api-format-version": "2" } });
    if (!response.ok) {
      const cause = await providerError(response);
      throw new AppError(response.status === 401 || response.status === 403 ? "GOOGLE_REAUTH_REQUIRED" : "UPSTREAM_UNAVAILABLE", undefined, false, { cause });
    }
    return await response.json() as T;
  }
  return {
    async listAccounts(pageToken) {
      const url = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return await request(url);
    },
    async listLocations(accountName, pageToken) {
      const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`);
      url.searchParams.set("readMask", "name,title,storefrontAddress,latlng,openInfo,categories,metadata");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return await request(url);
    },
  };
}

export const gbpClient = createGbpClient({ getAuth: getAuthorizedGoogleClient, fetchImpl: fetch });
