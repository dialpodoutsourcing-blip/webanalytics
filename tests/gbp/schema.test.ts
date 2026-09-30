import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

function model(name: string) {
  return Prisma.dmmf.datamodel.models.find((entry) => entry.name === name);
}

describe("GBP persistence schema", () => {
  it("exposes durable location, keyword, and analytics cache models", () => {
    const location = model("BusinessLocation");
    const keyword = model("TrackedKeyword");
    const cache = model("GbpAnalyticsCache");

    expect(location?.fields.find((field) => field.name === "googleLocationId")?.isUnique).toBe(true);
    expect(location?.fields.find((field) => field.name === "latitude")?.isRequired).toBe(false);
    expect(keyword?.uniqueFields).toContainEqual(["businessLocationId", "normalizedKeyword"]);
    expect(cache?.uniqueFields).toContainEqual(["businessLocationId", "reportType", "startDate", "endDate"]);
  });
});
