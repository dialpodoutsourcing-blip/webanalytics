# Geo-Grid Rank Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cost-controlled, scheduled Google Maps geo-grid rank tracker for every active GBP location and approved keyword, with accessible map and historical comparison views.

**Architecture:** Build on the GBP location and keyword interfaces from the preceding plan. Server-only services generate grids, estimate and enforce cost, submit DataForSEO Standard Queue tasks, persist point-level progress, and finalize derived metrics; authenticated UI routes only read normalized job data or explicitly request a scan.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Prisma 6/PostgreSQL, DataForSEO Google Maps SERP API, Leaflet, React Leaflet, OpenStreetMap-compatible tiles, Zod 4, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-09-30-local-seo-geogrid-gbp-design.md`

## Global Constraints

- Complete `2026-09-30-gbp-locations-analytics.md` first; this plan consumes its database and domain interfaces.
- Default scans use a 7 x 7 odd grid; opening or refreshing a page never starts a paid scan.
- Every billable submission is explicit or scheduler-initiated, idempotent, bounded, and recorded with estimated and actual cost.
- Weekly scans apply only to active/open locations and approved active keywords.
- Match targets by stable Google Maps identifier first; name/address fallback must be marked lower confidence.
- Preserve numeric/non-color status, an accessible table, and OpenStreetMap/tile-provider attribution.
- No automated test may call DataForSEO or another billable provider.
- Read the relevant files in `node_modules/next/dist/docs/` before changing App Router code.

## Review Focus

- High-latitude and antimeridian-adjacent grids must produce finite, bounded coordinates without row/column duplication; Task 2 tests this.
- Repeated manual clicks, scheduler retries, and concurrent requests must resolve to one billable job; Task 5 tests this.
- Partial scans must exclude failed points from ranking denominators while visibly reporting completion rate; Task 4 tests this.
- A target with a similar business name but different Maps identifier must not be credited; Task 3 tests this.
- Provider-reported actual cost above estimates must count toward weekly/monthly limits before later jobs are admitted; Task 5 tests this.

---

## File structure

- `prisma/schema.prisma` — scan jobs, point results, competitors, and spending records.
- `lib/env.ts` — DataForSEO, scheduler, map-tile, and cost-limit configuration.
- `features/geogrid/types.ts` — stable grid, job, point, and report types.
- `features/geogrid/grid.ts` — deterministic coordinate generation.
- `features/geogrid/cost.ts` — provider-independent cost policy.
- `features/geogrid/dataforseo.ts` — server-only provider adapter.
- `features/geogrid/matching.ts` — target and competitor normalization.
- `features/geogrid/metrics.ts` — rank aggregates and comparisons.
- `features/geogrid/scans.ts` — job creation, progress, retries, and finalization.
- `features/geogrid/scheduler.ts` — weekly due-work selection.
- `app/api/geogrid/*` — authenticated scan/report endpoints.
- `app/api/jobs/geogrid/route.ts` — scheduler-authenticated worker endpoint.
- `app/(dashboard)/local-seo/geogrid/page.tsx` — protected page shell.
- `components/local-seo/geogrid/*` — controls, map, table, metrics, history, and progress.
- `tests/geogrid/*` and `tests/components/local-seo/geogrid/*` — unit, route, orchestration, and UI coverage.

### Task 1: Add scan persistence and server configuration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/env.ts`
- Modify: `.env.example`
- Modify: `tests/lib/env.test.ts`
- Create: `tests/geogrid/schema.test.ts`

**Interfaces:**
- Consumes: `BusinessLocation` and `TrackedKeyword` from the GBP plan.
- Produces: `GeoGridScan`, `GeoGridPoint`, `GeoGridCompetitor`, and `ProviderSpend` models; `ScanStatus`, `PointStatus`, and `RequestOrigin` enums; validated private configuration.

- [ ] **Step 1: Write failing schema and environment tests**

Assert immutable scan configuration fields, unique fingerprint, unique scan/row/column points, provider task ID, match confidence, estimated/actual cost decimals, lifecycle indexes, and cascade behavior that never deletes historical scans when a keyword is paused. Assert positive cost limits, scheduler secret length, private DataForSEO credentials, and an HTTPS tile URL template in production.

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run tests/lib/env.test.ts tests/geogrid/schema.test.ts`
Expected: FAIL because scan models and configuration do not exist.

- [ ] **Step 3: Implement models and configuration**

Add `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `GEOGRID_MAX_SCAN_USD`, `GEOGRID_WEEKLY_LIMIT_USD`, `GEOGRID_MONTHLY_LIMIT_USD`, `GEOGRID_SCHEDULER_SECRET`, and `NEXT_PUBLIC_MAP_TILE_URL`; never expose provider credentials through a public prefix.

- [ ] **Step 4: Generate and verify**

Run: `npx prisma validate && npx prisma generate && npm test -- --run tests/lib/env.test.ts tests/geogrid/schema.test.ts`
Expected: all commands exit 0 and focused tests pass.

- [ ] **Step 5: Commit**

Run: `git add prisma/schema.prisma lib/env.ts .env.example tests/lib/env.test.ts tests/geogrid/schema.test.ts && git commit -m "feat: add geo-grid scan persistence"`

### Task 2: Generate deterministic geographic grids

**Files:**
- Create: `features/geogrid/types.ts`
- Create: `features/geogrid/grid.ts`
- Create: `tests/geogrid/grid.test.ts`

**Interfaces:**
- Produces: `type GridConfig = { centerLat: number; centerLng: number; size: number; radiusKm: number }`; `type GridPoint = { row: number; column: number; latitude: number; longitude: number }`; `parseGridConfig(input: unknown): GridConfig`; `generateGrid(config: GridConfig): GridPoint[]`.

- [ ] **Step 1: Write failing grid tests**

Assert 7 x 7 produces 49 points; the center point exactly equals the business coordinates; rows run north-to-south and columns west-to-east; spacing uses latitude-aware longitude offsets; only odd sizes 3 through 15 and radii 0.1 through 50 km pass; poles/high latitudes remain finite; longitude wraps across the antimeridian; all row/column pairs are unique.

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run tests/geogrid/grid.test.ts`
Expected: FAIL because the grid module does not exist.

- [ ] **Step 3: Implement validation and Haversine-compatible offsets**

Generate coordinates deterministically from the immutable configuration, clamp latitude to valid bounds, wrap longitude to `[-180, 180]`, and round only for stable persistence/fingerprints rather than display.

- [ ] **Step 4: Verify focused tests**

Run: `npm test -- --run tests/geogrid/grid.test.ts`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

Run: `git add features/geogrid/types.ts features/geogrid/grid.ts tests/geogrid/grid.test.ts && git commit -m "feat: generate geo-grid coordinates"`

### Task 3: Add the DataForSEO adapter and target matching

**Files:**
- Create: `features/geogrid/dataforseo.ts`
- Create: `features/geogrid/matching.ts`
- Create: `tests/geogrid/dataforseo.test.ts`
- Create: `tests/geogrid/matching.test.ts`

**Interfaces:**
- Consumes: `GridPoint` from Task 2.
- Produces: `createDataForSeoClient(config, fetchImpl): DataForSeoClient`; `submitMapTasks(requests): Promise<SubmittedTask[]>`; `getMapTasks(ids): Promise<ProviderTaskResult[]>`; `matchTarget(results, target): TargetMatch`; `normalizeCompetitors(results): CompetitorObservation[]`.

- [ ] **Step 1: Write failing provider contract tests**

Assert Basic authentication remains server-side; Standard Queue payloads include keyword, coordinate, language, and depth; batches respect provider limits; task IDs and reported costs normalize; non-success provider status codes become stable errors; malformed/empty results do not become rank zero.

- [ ] **Step 2: Write failing matching tests**

Assert exact Maps/place identifier wins regardless of display-name variation; a different identifier with the same name is rejected; normalized name plus address fallback is lower confidence; ambiguous fallback is not credited; competitors deduplicate by identifier.

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/geogrid/dataforseo.test.ts tests/geogrid/matching.test.ts`
Expected: FAIL because provider and matching modules do not exist.

- [ ] **Step 4: Implement the server-only adapter and matching**

Use injected `fetch` for tests, preserve raw provider data only inside the adapter boundary, and return serializable normalized observations without credentials or unbounded HTML.

- [ ] **Step 5: Verify focused tests**

Run: `npm test -- --run tests/geogrid/dataforseo.test.ts tests/geogrid/matching.test.ts`
Expected: all focused tests pass.

- [ ] **Step 6: Commit**

Run: `git add features/geogrid/dataforseo.ts features/geogrid/matching.ts tests/geogrid/dataforseo.test.ts tests/geogrid/matching.test.ts && git commit -m "feat: add Maps ranking provider adapter"`

### Task 4: Calculate cost and ranking metrics

**Files:**
- Create: `features/geogrid/cost.ts`
- Create: `features/geogrid/metrics.ts`
- Create: `tests/geogrid/cost.test.ts`
- Create: `tests/geogrid/metrics.test.ts`

**Interfaces:**
- Consumes: normalized point observations from Task 3.
- Produces: `estimateScanCost(input, pricing): Money`; `checkSpendPolicy(input): SpendDecision`; `calculateScanMetrics(points): ScanMetrics`; `compareScans(current, previous): GridComparison`.

- [ ] **Step 1: Write failing cost tests**

Assert point count multiplies the configured provider price; decimal arithmetic avoids floating-point admission errors; per-scan, rolling weekly, and calendar-month limits reject before submission; actual recorded provider cost is used over estimates for later admission; equality at the limit is allowed.

- [ ] **Step 2: Write failing metric tests**

Assert average rank uses found points only and reports not-found separately; top-3/top-10 denominators use successfully queried points; partial completion rate is explicit; zero successful points yields null aggregates; weighted visibility is documented and bounded 0-100; comparison requires identical grid configuration and labels improved/declined/unchanged/new/lost points.

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/geogrid/cost.test.ts tests/geogrid/metrics.test.ts`
Expected: FAIL because cost and metric modules do not exist.

- [ ] **Step 4: Implement cost policy and metrics**

Use integer micro-dollars or Prisma Decimal throughout cost calculations. Define visibility per successful point as `max(0, 21 - rank) / 20 * 100` for ranks 1-20 and zero for not found, then average across successful points.

- [ ] **Step 5: Verify focused tests**

Run: `npm test -- --run tests/geogrid/cost.test.ts tests/geogrid/metrics.test.ts`
Expected: all focused tests pass.

- [ ] **Step 6: Commit**

Run: `git add features/geogrid/cost.ts features/geogrid/metrics.ts tests/geogrid/cost.test.ts tests/geogrid/metrics.test.ts && git commit -m "feat: calculate geo-grid cost and visibility"`

### Task 5: Orchestrate idempotent, resumable scan jobs

**Files:**
- Create: `features/geogrid/scans.ts`
- Create: `tests/geogrid/scans.test.ts`
- Create: `app/api/geogrid/scans/route.ts`
- Create: `app/api/geogrid/scans/[scanId]/route.ts`
- Create: `tests/geogrid/scan-routes.test.ts`

**Interfaces:**
- Consumes: grid, cost, provider, matching, metrics, Prisma, locations, and keywords from prior tasks/plans.
- Produces: `createScan(input, origin): Promise<ScanView>`; `advanceScan(scanId): Promise<ScanView>`; `retryFailedPoints(scanId): Promise<ScanView>`; `getScan(scanId): Promise<ScanReport>`; POST/GET scan routes.

- [ ] **Step 1: Write failing orchestration tests**

Cover valid location/approved-keyword enforcement, missing coordinates, cost rejection before provider calls, fingerprint reuse, concurrent duplicate creation, batched submission, point-level persistence, polling completion, actual spend recording, retrying only transient failed points, partial completion, permanent failures, and final metric calculation.

- [ ] **Step 2: Write failing route tests**

Assert session authentication, explicit POST-only creation, validation errors, `409` with code `COST_LIMIT_EXCEEDED` for cost-policy rejection, GET status/report reads without provider submissions, location/keyword membership checks, and safe failure messages.

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/geogrid/scans.test.ts tests/geogrid/scan-routes.test.ts`
Expected: FAIL because orchestration and routes do not exist.

- [ ] **Step 4: Implement transactional job creation and advancement**

Derive the fingerprint from location, normalized keyword, grid configuration, language, provider method, and weekly schedule window. Use a unique constraint plus transaction to make concurrent creation safe; persist provider task IDs before returning; never resubmit successful points.

- [ ] **Step 5: Implement protected routes**

POST creates or returns a job, GET reads persisted state, and an explicit retry action advances only eligible points. Keep all provider calls behind service functions.

- [ ] **Step 6: Verify focused tests**

Run: `npm test -- --run tests/geogrid/scans.test.ts tests/geogrid/scan-routes.test.ts`
Expected: all focused tests pass.

- [ ] **Step 7: Commit**

Run: `git add features/geogrid/scans.ts tests/geogrid/scans.test.ts app/api/geogrid/scans tests/geogrid/scan-routes.test.ts && git commit -m "feat: orchestrate geo-grid scans"`

### Task 6: Schedule weekly scans safely

**Files:**
- Create: `features/geogrid/scheduler.ts`
- Create: `tests/geogrid/scheduler.test.ts`
- Create: `app/api/jobs/geogrid/route.ts`
- Create: `tests/geogrid/scheduler-route.test.ts`
- Create: `vercel.json`

**Interfaces:**
- Consumes: active locations/keywords and `createScan()`/`advanceScan()` from Task 5.
- Produces: `runGeoGridSchedule(now): Promise<SchedulerSummary>`; authenticated `POST /api/jobs/geogrid`; weekly Vercel Cron invocation.

- [ ] **Step 1: Write failing scheduler tests**

Assert only open, tracking-active locations with approved active keywords are selected; once-per-week fingerprinting; bounded jobs/points per invocation; due work continues across invocations; one location failure does not stop others; budget exhaustion stops new submissions but allows status advancement.

- [ ] **Step 2: Write failing scheduler-route tests**

Assert missing/wrong Bearer secret returns `401`, browser portal session alone is insufficient, correct secret invokes scheduling, and response exposes counts but no provider payloads.

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/geogrid/scheduler.test.ts tests/geogrid/scheduler-route.test.ts`
Expected: FAIL because scheduler modules do not exist.

- [ ] **Step 4: Implement scheduling and deployment configuration**

Use UTC weekly windows, stable ordering, configured batch limits, and a Vercel Cron entry. Do not rely on in-process timers.

- [ ] **Step 5: Verify focused tests**

Run: `npm test -- --run tests/geogrid/scheduler.test.ts tests/geogrid/scheduler-route.test.ts`
Expected: all focused tests pass.

- [ ] **Step 6: Commit**

Run: `git add features/geogrid/scheduler.ts tests/geogrid/scheduler.test.ts app/api/jobs/geogrid tests/geogrid/scheduler-route.test.ts vercel.json && git commit -m "feat: schedule weekly geo-grid scans"`

### Task 7: Build the accessible geo-grid report

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `app/(dashboard)/local-seo/geogrid/page.tsx`
- Create: `components/local-seo/geogrid/geogrid-workspace.tsx`
- Create: `components/local-seo/geogrid/geogrid-map.tsx`
- Create: `components/local-seo/geogrid/geogrid-table.tsx`
- Create: `components/local-seo/geogrid/scan-controls.tsx`
- Create: `components/local-seo/geogrid/scan-summary.tsx`
- Create: `tests/components/local-seo/geogrid/geogrid-workspace.test.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: GBP location/keyword APIs and scan APIs.
- Produces: protected `/local-seo/geogrid` page with explicit scan controls, polling, map, accessible table, summary, and history comparison.

- [ ] **Step 1: Install pinned mapping dependencies**

Run: `npm install leaflet react-leaflet && npm install -D @types/leaflet`
Expected: package manifests record compatible versions and install exits 0.

- [ ] **Step 2: Write failing workspace tests**

Assert page load performs GET reads only; location/keyword/history selection; 7 x 7 defaults; pre-submit point/cost confirmation; explicit scan action; queued/running/partial/failed/complete states; no-coordinate block; stale history; green 1-3, amber 4-10, red 11-20, gray not-found labels; numeric/non-color markers; accessible table parity; comparison labels.

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/components/local-seo/geogrid/geogrid-workspace.test.tsx`
Expected: FAIL because the workspace does not exist.

- [ ] **Step 4: Implement controls, summary, and polling workspace**

Keep page shell server-rendered and interactive workflow inside one focused client boundary. Stop polling at terminal states and on unmount; never POST from an effect tied to page load.

- [ ] **Step 5: Implement Leaflet map and accessible table**

Dynamically load the browser-only map component, preserve tile attribution, make markers keyboard reachable with rank text, and render the identical point dataset in the semantic table.

- [ ] **Step 6: Add scoped responsive styling and navigation**

Match the portal design, keep controls usable on narrow screens, and add Geo-Grid Rankings beside GBP Analytics under Local SEO.

- [ ] **Step 7: Verify focused and repository checks**

Run: `npm test -- --run tests/components/local-seo/geogrid/geogrid-workspace.test.tsx && npm run check && npm run build`
Expected: focused tests pass, lint/typecheck exit 0, and production build succeeds.

- [ ] **Step 8: Commit**

Run: `git add package.json package-lock.json "app/(dashboard)/local-seo/geogrid/page.tsx" components/local-seo/geogrid components/app-shell.tsx app/globals.css tests/components/local-seo/geogrid && git commit -m "feat: add accessible geo-grid report"`

### Task 8: Add attribution, deployment guidance, and end-to-end verification

**Files:**
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`
- Modify: `docs/API_INTEGRATION.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/SECURITY_AND_ENV.md`
- Modify: `docs/ROADMAP.md`
- Create: `tests/e2e/geogrid.spec.ts`

**Interfaces:**
- Consumes: completed geo-grid feature.
- Produces: license compliance, setup/runbook, mocked browser smoke test, and explicit live-smoke procedure.

- [ ] **Step 1: Add license and attribution records**

Record adapted SEO Playground copyright/license text, Leaflet attribution, and OpenStreetMap attribution obligations. Identify adapted files in repository history or comments where required by the MIT notice.

- [ ] **Step 2: Document configuration and operations**

Document DataForSEO account setup, private credentials, current pricing verification, cost caps, tile provider, scheduler secret, cron behavior, retry/recovery, metrics formulas, and the fact that page views never spend credits.

- [ ] **Step 3: Write the browser smoke test**

Mock internal APIs and assert an authenticated user can select a location/keyword, see cost confirmation, explicitly start a scan, observe progress, inspect numeric map markers/table rows, and compare history without any external request.

- [ ] **Step 4: Run full automated verification**

Run: `npm test -- --run && npm run check && npm run build && npm run test:e2e && git diff --check`
Expected: all unit/component tests and browser tests pass, lint/typecheck and build exit 0, and diff check reports no errors.

- [ ] **Step 5: Perform the explicit live smoke test after credentials exist**

Run one manually confirmed 3 x 3 scan with a cost ceiling in a non-production environment. Verify 9 terminal point records, target matching evidence, actual recorded cost, map/table parity, and that refreshing the report makes no provider request. This step is blocked—not skipped—until the owner supplies configured DataForSEO credentials and Google Business Profile API approval.

- [ ] **Step 6: Commit**

Run: `git add THIRD_PARTY_NOTICES.md README.md docs tests/e2e/geogrid.spec.ts && git commit -m "docs: document geo-grid operations and attribution"`
