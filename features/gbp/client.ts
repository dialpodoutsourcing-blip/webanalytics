import type { Auth } from "googleapis";
import { AppError } from "@/lib/errors";
import { getAuthorizedGoogleClient } from "@/features/google/oauth";
import type { GbpClient } from "./types";

type ClientDependencies = {
  getAuth: () => Promise<Auth.OAuth2Client>;
  fetchImpl: typeof fetch;
};

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
    if (!response.ok) throw new AppError(response.status === 401 || response.status === 403 ? "GOOGLE_REAUTH_REQUIRED" : "UPSTREAM_UNAVAILABLE");
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
      url.searchParams.set("readMask", "name,title,storefrontAddress,latlng,openInfo,categories");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return await request(url);
    },
  };
}

export const gbpClient = createGbpClient({ getAuth: getAuthorizedGoogleClient, fetchImpl: fetch });
