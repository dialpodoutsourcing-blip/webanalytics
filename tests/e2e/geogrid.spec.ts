import { expect, test } from "@playwright/test";

test("an authenticated user explicitly starts and reads a geo-grid scan", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");

  await page.route("**/api/gbp/locations", (route) => route.fulfill({
    json: { data: [{ googleLocationId: "locations/1", title: "Lotus Vet", address: "1 Main", status: "OPEN", latitude: 28.5, longitude: -81.3 }] },
  }));
  await page.route("**/api/gbp/keywords?**", (route) => route.fulfill({
    json: { data: [{ id: "key", displayKeyword: "veterinarian", state: "APPROVED", defaultGridSize: 7, radiusKm: 2 }] },
  }));
  await page.route("**/api/geogrid/scans", (route) => route.fulfill({
    status: 202,
    json: { data: { id: "scan", status: "RUNNING" } },
  }));
  await page.route("**/api/geogrid/scans/scan", (route) => route.fulfill({
    json: {
      data: {
        id: "scan",
        status: "COMPLETE",
        metrics: { averageRank: 2, top3Coverage: 100, top10Coverage: 100, visibility: 95, completionRate: 100 },
        points: [{ row: 0, column: 0, latitude: 28.5, longitude: -81.3, status: "COMPLETE", rank: 2, competitors: [] }],
      },
    },
  }));
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 204 }));

  await page.goto("/local-seo/geogrid");
  const fields = await page.locator(".scan-fields").boundingBox();
  const actions = await page.locator(".scan-actions").boundingBox();
  expect(fields).not.toBeNull();
  expect(actions).not.toBeNull();
  expect(actions!.y).toBeGreaterThanOrEqual(fields!.y + fields!.height - 1);
  await page.getByLabel("Business Profile location").selectOption("locations/1");
  await page.getByLabel("Tracked keyword").selectOption("key");
  await expect(page.getByText("49 points")).toBeVisible();
  await page.getByRole("button", { name: "Run new scan" }).click();
  await expect(page.getByRole("cell", { name: "2", exact: true })).toBeVisible();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(1);
});
