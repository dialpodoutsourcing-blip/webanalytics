export type BusinessLocationSummary = {
  id?: string;
  googleLocationId: string;
  googleAccountId: string;
  title: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryCategory: string | null;
  status: "OPEN" | "CLOSED" | "UNKNOWN";
  isTrackingActive: boolean;
  lastSynchronizedAt: Date;
};

export type GbpAccount = { name?: string | null };
export type GbpLocation = {
  name?: string | null;
  title?: string | null;
  storefrontAddress?: { addressLines?: string[] | null; locality?: string | null; administrativeArea?: string | null; postalCode?: string | null } | null;
  latlng?: { latitude?: number | null; longitude?: number | null } | null;
  openInfo?: { status?: string | null } | null;
  categories?: { primaryCategory?: { displayName?: string | null } | null } | null;
};

export type GbpClient = {
  listAccounts(pageToken?: string): Promise<{ accounts: GbpAccount[]; nextPageToken?: string }>;
  listLocations(accountName: string, pageToken?: string): Promise<{ locations: GbpLocation[]; nextPageToken?: string }>;
};
