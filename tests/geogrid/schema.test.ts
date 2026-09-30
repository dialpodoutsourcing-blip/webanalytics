import { Prisma } from "@prisma/client";
import { expect, it } from "vitest";
it("generates geo-grid scan, point, competitor, and spend models", () => {
  expect(Object.values(Prisma.ModelName)).toEqual(expect.arrayContaining(["GeoGridScan","GeoGridPoint","GeoGridCompetitor","ProviderSpend"]));
});
