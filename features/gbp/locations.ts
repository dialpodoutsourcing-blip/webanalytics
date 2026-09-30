import { prisma } from "@/lib/prisma";
import { gbpClient } from "./client";
import type { BusinessLocationSummary, GbpClient, GbpLocation } from "./types";

export type BusinessLocationStore = {
  upsert(value: BusinessLocationSummary): Promise<unknown>;
  list(): Promise<BusinessLocationSummary[]>;
};

const prismaLocationStore: BusinessLocationStore = {
  async upsert(value) {
    const { googleLocationId, isTrackingActive, ...providerData } = value;
    return await prisma.businessLocation.upsert({ where: { googleLocationId }, create: { googleLocationId, isTrackingActive, ...providerData }, update: providerData });
  },
  async list() {
    return await prisma.businessLocation.findMany({ orderBy: [{ title: "asc" }, { address: "asc" }] });
  },
};

function addressOf(location: GbpLocation) {
  const address = location.storefrontAddress;
  const parts = [...(address?.addressLines ?? []), address?.locality, address?.administrativeArea, address?.postalCode].filter((part): part is string => Boolean(part?.trim()));
  return parts.length ? parts.join(", ") : null;
}

function statusOf(value?: string | null): BusinessLocationSummary["status"] {
  if (value === "OPEN") return "OPEN";
  if (value?.startsWith("CLOSED")) return "CLOSED";
  return "UNKNOWN";
}

export async function syncBusinessLocations(deps: { client?: GbpClient; store?: BusinessLocationStore; now?: () => Date } = {}) {
  const client = deps.client ?? gbpClient;
  const store = deps.store ?? prismaLocationStore;
  const now = deps.now ?? (() => new Date());
  const accounts: string[] = [];
  let accountToken: string | undefined;
  do {
    const page = await client.listAccounts(accountToken);
    for (const account of page.accounts) if (account.name) accounts.push(account.name);
    accountToken = page.nextPageToken;
  } while (accountToken);

  const seen = new Set<string>();
  for (const account of accounts) {
    let locationToken: string | undefined;
    do {
      const page = await client.listLocations(account, locationToken);
      for (const location of page.locations) {
        if (!location.name || seen.has(location.name)) continue;
        seen.add(location.name);
        const coordinates = location.latlng;
        await store.upsert({
          googleLocationId: location.name,
          googleAccountId: account,
          mapsPlaceId: location.metadata?.placeId ?? null,
          title: location.title?.trim() || location.name,
          address: addressOf(location),
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          primaryCategory: location.categories?.primaryCategory?.displayName ?? null,
          status: statusOf(location.openInfo?.status),
          isTrackingActive: false,
          lastSynchronizedAt: now(),
        });
      }
      locationToken = page.nextPageToken;
    } while (locationToken);
  }
  return await store.list();
}

export async function listStoredBusinessLocations() {
  return await prismaLocationStore.list();
}
