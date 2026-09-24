import { get, put } from "@vercel/blob";
import { parseConnectionRecord, type SharedGoogleConnection } from "./connection-record";

const PATHNAME = "private/google/shared-connection.json";
const writeOptions = {
  access: "private" as const,
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
  cacheControlMaxAge: 60,
};

type StoreDependencies = {
  getObject: () => Promise<unknown | null>;
  putObject: (pathname: string, body: string, options: typeof writeOptions) => Promise<unknown>;
};

export type ConnectionStore = {
  read(): Promise<SharedGoogleConnection | null>;
  write(record: SharedGoogleConnection): Promise<void>;
};

export function createConnectionStore(deps: StoreDependencies): ConnectionStore {
  return {
    async read() {
      const value = await deps.getObject();
      return value === null ? null : parseConnectionRecord(value);
    },
    async write(record) {
      await deps.putObject(PATHNAME, JSON.stringify(record), writeOptions);
    },
  };
}

export const blobConnectionStore = createConnectionStore({
  async getObject() {
    const result = await get(PATHNAME, { access: "private", useCache: false });
    return result ? new Response(result.stream).json() : null;
  },
  putObject: put,
});
