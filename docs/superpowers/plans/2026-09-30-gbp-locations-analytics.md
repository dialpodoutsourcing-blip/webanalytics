# GBP Locations and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable GBP location synchronization, performance analytics, search-query suggestions, and approved tracked keywords for every location managed by the shared Google account.

**Architecture:** Extend the shared OAuth grant and add focused GBP adapters that normalize Google responses before they reach authenticated route handlers or UI components. Persist synchronized locations, keyword choices, and cached analytics in PostgreSQL through Prisma so the follow-on geo-grid plan can safely schedule work on Vercel.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Prisma 6/PostgreSQL, Google Business Profile REST APIs, Zod 4, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-30-local-seo-geogrid-gbp-design.md`

## Global Constraints

- Support every GBP location available to the connected owner account.
- Request `business.manage` alongside the existing Search Console read-only scope; never expose tokens to the browser.
- Google remains authoritative for location information; historical records are not deleted during synchronization.
- Closed locations remain visible but default to inactive tracking.
- Keyword suggestions require explicit approval before they can become tracking targets.
- Route handlers remain thin, authenticated, uncached, and return normalized internal data.
- No automated test may call Google or create a billable request.
- Read the relevant files in `node_modules/next/dist/docs/` before changing App Router code.

## Review Focus

- Accounts containing indirect business-group locations must paginate and deduplicate without dropping locations; Task 3 tests this.
- Locations with no coordinates must remain usable for analytics and be marked ineligible for geo-grid scans; Task 3 tests this.
- Reauthorization that returns no refresh token must not destroy the existing usable grant; Task 2 tests this.
- Missing or delayed GBP metric series must normalize to explicit empty series rather than throw or invent zeros; Task 5 tests this.
- Repeated keyword suggestions with case or whitespace differences must not create duplicate tracked keywords; Task 6 tests this.

---

## File structure

- `prisma/schema.prisma` — PostgreSQL models for GBP locations, keywords, and report cache.
- `lib/env.ts` — validates database and Google configuration.
- `features/google/oauth.ts` — shared OAuth scopes and refresh-token-safe reconnect.
- `features/gbp/types.ts` — stable internal GBP types.
- `features/gbp/client.ts` — authenticated Google REST transport.
- `features/gbp/locations.ts` — account/location pagination, normalization, and persistence.
- `features/gbp/performance.ts` — metric and monthly-query normalization.
- `features/gbp/keywords.ts` — suggestion merge and tracked-keyword commands.
- `app/api/gbp/locations/route.ts` — protected location list/sync endpoint.
- `app/api/gbp/analytics/route.ts` — protected analytics endpoint.
- `app/api/gbp/keywords/route.ts` — protected keyword list/create/update endpoint.
- `app/(dashboard)/local-seo/analytics/page.tsx` — GBP Analytics page shell.
- `components/local-seo/location-picker.tsx` — reusable interactive location selector.
- `components/local-seo/gbp-analytics.tsx` — cards, trends, queries, and data states.
- `components/local-seo/keyword-manager.tsx` — suggestion approval and manual keyword UI.
- `tests/gbp/*` and `tests/components/local-seo/*` — unit, route, and component coverage.

### Task 1: Durable GBP persistence foundation

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env.example`
- Modify: `lib/env.ts`
- Modify: `tests/lib/env.test.ts`
- Create: `tests/gbp/schema.test.ts`
- Modify: `docs/SECURITY_AND_ENV.md`

**Interfaces:**
- Consumes: existing `DATABASE_URL` environment entry.
- Produces: Prisma models `BusinessLocation`, `TrackedKeyword`, and `GbpAnalyticsCache`; enums `LocationStatus`, `KeywordSource`, and `KeywordState`.

- [ ] **Step 1: Write failing schema and environment tests**

Assert the Prisma schema uses `provider = "postgresql"`; `BusinessLocation.googleLocationId` is unique and stores nullable coordinates plus active/open state; `TrackedKeyword` has a unique location/normalized-keyword pair; `GbpAnalyticsCache` is unique by location/report/date range. Assert `parseEnv` accepts a PostgreSQL URL and rejects a production SQLite URL.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --run tests/lib/env.test.ts tests/gbp/schema.test.ts`
Expected: FAIL because the models and production database rule do not exist.

- [ ] **Step 3: Implement the schema and configuration**

Add the exact models/enums above, switch the Prisma datasource to PostgreSQL, document local PostgreSQL setup and migration commands, and retain existing models during the migration. Do not store provider tokens in the new records.

- [ ] **Step 4: Generate Prisma and verify**

Run: `npx prisma validate && npx prisma generate && npm test -- --run tests/lib/env.test.ts tests/gbp/schema.test.ts`
Expected: all commands exit 0 and focused tests pass.

- [ ] **Step 5: Commit**

Run: `git add prisma/schema.prisma .env.example lib/env.ts tests/lib/env.test.ts tests/gbp/schema.test.ts docs/SECURITY_AND_ENV.md && git commit -m "feat: add durable GBP data model"`

### Task 2: Expand the shared Google authorization

**Files:**
- Modify: `features/google/oauth.ts`
- Modify: `features/google/connection-record.ts`
- Modify: `tests/google/oauth.test.ts`
- Modify: `app/(dashboard)/settings/page.tsx`
- Modify: `tests/components/settings.test.tsx`

**Interfaces:**
- Consumes: existing `ConnectionStore` and encrypted refresh-token helpers.
- Produces: `GOOGLE_OAUTH_SCOPES: readonly string[]`; `getAuthorizedGoogleClient(): Promise<Auth.OAuth2Client>` authorized for Search Console and GBP.

- [ ] **Step 1: Write failing OAuth and Settings tests**

Assert the authorization URL requests exactly Search Console read-only and `business.manage`; reconnect preserves an existing refresh token when Google omits a new one; connection status reports `needsAttention` when the saved scope lacks GBP; Settings explains the one-time reconnect and labels both Search Console and Business Profile access.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --run tests/google/oauth.test.ts tests/components/settings.test.tsx`
Expected: FAIL on the missing GBP scope and refresh-token preservation.

- [ ] **Step 3: Implement scope-aware OAuth**

Export the scope constant, merge a newly returned refresh token with the stored token, persist the granted scope string, and make status compare the stored scopes with the required set. Keep `prompt: "consent"` and offline access.

- [ ] **Step 4: Verify the focused tests**

Run: `npm test -- --run tests/google/oauth.test.ts tests/components/settings.test.tsx tests/google/oauth-routes.test.ts`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

Run: `git add features/google/oauth.ts features/google/connection-record.ts tests/google/oauth.test.ts "app/(dashboard)/settings/page.tsx" tests/components/settings.test.tsx && git commit -m "feat: authorize Google Business Profile access"`

### Task 3: Synchronize every accessible GBP location

**Files:**
- Create: `features/gbp/types.ts`
- Create: `features/gbp/client.ts`
- Create: `features/gbp/locations.ts`
- Create: `tests/gbp/locations.test.ts`

**Interfaces:**
- Consumes: `getAuthorizedGoogleClient()` from Task 2 and Prisma client.
- Produces: `type BusinessLocationSummary`; `createGbpClient(deps): GbpClient`; `syncBusinessLocations(deps?): Promise<BusinessLocationSummary[]>`; `listStoredBusinessLocations(): Promise<BusinessLocationSummary[]>`.

- [ ] **Step 1: Write failing adapter and synchronization tests**

Cover account pagination, location pagination, indirect/group-owned locations, duplicate Google location IDs, open/closed mapping, coordinate extraction, missing coordinates, mutable-field updates, new open-location defaults, and preservation of stored rows that disappear upstream.

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run tests/gbp/locations.test.ts`
Expected: FAIL because the GBP modules do not exist.

- [ ] **Step 3: Implement the authenticated REST client**

Implement server-only JSON requests for Account Management and Business Information endpoints using the OAuth client's access token. Require read masks for location fields and translate non-2xx responses into stable `AppError` codes.

- [ ] **Step 4: Implement normalization and upsert synchronization**

Normalize to serializable internal types, paginate until no token remains, deduplicate by Google location ID, upsert mutable fields, and return all stored locations ordered by title then address.

- [ ] **Step 5: Verify focused tests**

Run: `npm test -- --run tests/gbp/locations.test.ts tests/google/oauth.test.ts`
Expected: all focused tests pass.

- [ ] **Step 6: Commit**

Run: `git add features/gbp tests/gbp/locations.test.ts && git commit -m "feat: synchronize Business Profile locations"`

### Task 4: Expose protected location APIs and shared selector

**Files:**
- Create: `app/api/gbp/locations/route.ts`
- Create: `components/local-seo/location-picker.tsx`
- Create: `tests/gbp/location-routes.test.ts`
- Create: `tests/components/local-seo/location-picker.test.tsx`
- Modify: `components/app-shell.tsx`

**Interfaces:**
- Consumes: `syncBusinessLocations()` and `listStoredBusinessLocations()` from Task 3.
- Produces: `GET /api/gbp/locations`; `POST /api/gbp/locations` for explicit sync; `LocationPicker({ value, onChange, locations })`.

- [ ] **Step 1: Write failing route and component tests**

Assert both methods reject unauthenticated requests; GET returns stored locations without implicit provider calls; POST synchronizes; missing-coordinate and closed statuses render as text; the picker emits a selected Google location ID and handles empty/error states.

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run tests/gbp/location-routes.test.ts tests/components/local-seo/location-picker.test.tsx`
Expected: FAIL because routes and selector do not exist.

- [ ] **Step 3: Implement the routes and selector**

Keep GET read-only and POST explicit, return `{ data }` or safe `{ error }`, and add a Local SEO navigation group with an Analytics link. Do not add the geo-grid page until the second plan.

- [ ] **Step 4: Verify focused tests**

Run: `npm test -- --run tests/gbp/location-routes.test.ts tests/components/local-seo/location-picker.test.tsx`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

Run: `git add app/api/gbp/locations components/local-seo/location-picker.tsx components/app-shell.tsx tests/gbp/location-routes.test.ts tests/components/local-seo/location-picker.test.tsx && git commit -m "feat: add Business Profile location picker"`

### Task 5: Fetch and normalize GBP performance analytics

**Files:**
- Create: `features/gbp/performance.ts`
- Create: `tests/gbp/performance.test.ts`
- Create: `app/api/gbp/analytics/route.ts`
- Create: `tests/gbp/analytics-route.test.ts`

**Interfaces:**
- Consumes: stored business locations, `GbpClient`, and `GbpAnalyticsCache`.
- Produces: `parseGbpAnalyticsRequest(input: unknown): GbpAnalyticsRequest`; `getGbpAnalytics(input): Promise<GbpAnalyticsReport>`; `GET /api/gbp/analytics?locationId=&startDate=&endDate=`.

- [ ] **Step 1: Write failing performance normalization tests**

Assert inclusive ISO date validation, maximum 18-month range, daily impression/call/direction/website-click normalization, separate monthly query impressions, absent metric series as empty arrays, zero values preserved, cache reads, and safe stale fallback after an upstream failure.

- [ ] **Step 2: Write failing route tests**

Assert authentication, invalid query `400`, unknown location `404`, reauthorization `503`, and normalized success/stale response shapes.

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/gbp/performance.test.ts tests/gbp/analytics-route.test.ts`
Expected: FAIL because analytics parsing, service, and route do not exist.

- [ ] **Step 4: Implement the performance service and cache**

Call `fetchMultiDailyMetricsTimeSeries` and paginated monthly search-keyword impressions, normalize Google date objects to ISO dates, cache each report by location/type/range, and return stale cached data only when it exists.

- [ ] **Step 5: Implement the authenticated route**

Parse `request.nextUrl.searchParams` in the handler, delegate to the service, and translate `AppError` values without returning provider payloads.

- [ ] **Step 6: Verify focused tests**

Run: `npm test -- --run tests/gbp/performance.test.ts tests/gbp/analytics-route.test.ts`
Expected: all focused tests pass.

- [ ] **Step 7: Commit**

Run: `git add features/gbp/performance.ts tests/gbp/performance.test.ts app/api/gbp/analytics tests/gbp/analytics-route.test.ts && git commit -m "feat: add Business Profile analytics API"`

### Task 6: Manage suggested and manual tracked keywords

**Files:**
- Create: `features/gbp/keywords.ts`
- Create: `tests/gbp/keywords.test.ts`
- Create: `app/api/gbp/keywords/route.ts`
- Create: `tests/gbp/keyword-routes.test.ts`
- Create: `components/local-seo/keyword-manager.tsx`
- Create: `tests/components/local-seo/keyword-manager.test.tsx`

**Interfaces:**
- Consumes: monthly query impressions from Task 5 and Prisma `TrackedKeyword`.
- Produces: `normalizeKeyword(value: string): string`; `listLocationKeywords(locationId): Promise<KeywordView[]>`; `createKeyword(input)`; `updateKeyword(input)`; GET/POST/PATCH `/api/gbp/keywords`.

- [ ] **Step 1: Write failing keyword service tests**

Cover trim/case normalization, Unicode preservation, empty/overlong rejection, suggestion merge, case/whitespace deduplication, explicit approval, manual source, pause/reactivate behavior, location isolation, and historical-row preservation on pause.

- [ ] **Step 2: Write failing route and component tests**

Cover auth, validation, unknown locations, approve/add/pause actions, no automatic approval, and accessible labels/status messages.

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/gbp/keywords.test.ts tests/gbp/keyword-routes.test.ts tests/components/local-seo/keyword-manager.test.tsx`
Expected: FAIL because the keyword workflow does not exist.

- [ ] **Step 4: Implement the keyword service and routes**

Use a normalized keyword only for identity, preserve display text, and require a state-changing POST/PATCH for approval or tracking changes.

- [ ] **Step 5: Implement the keyword manager**

Render suggested and tracked groups, impression counts when available, approve/add/pause controls, and independent loading/error states.

- [ ] **Step 6: Verify focused tests**

Run: `npm test -- --run tests/gbp/keywords.test.ts tests/gbp/keyword-routes.test.ts tests/components/local-seo/keyword-manager.test.tsx`
Expected: all focused tests pass.

- [ ] **Step 7: Commit**

Run: `git add features/gbp/keywords.ts tests/gbp/keywords.test.ts app/api/gbp/keywords tests/gbp/keyword-routes.test.ts components/local-seo/keyword-manager.tsx tests/components/local-seo/keyword-manager.test.tsx && git commit -m "feat: add GBP keyword tracking workflow"`

### Task 7: Build the GBP Analytics page

**Files:**
- Create: `app/(dashboard)/local-seo/analytics/page.tsx`
- Create: `components/local-seo/gbp-analytics.tsx`
- Create: `components/local-seo/types.ts`
- Create: `tests/components/local-seo/gbp-analytics.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: location, analytics, and keyword APIs from Tasks 4-6.
- Produces: protected `/local-seo/analytics` interface with location/date selection, metric cards, trends, search queries, and keyword management.

- [ ] **Step 1: Write failing page/component tests**

Assert location switching reloads isolated data; summary cards and daily series label official Google data; monthly queries render with approval controls; missing series, stale cache, API errors, closed locations, and no locations have distinct messages; no page render triggers a geo-grid scan.

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run tests/components/local-seo/gbp-analytics.test.tsx`
Expected: FAIL because the page and component do not exist.

- [ ] **Step 3: Implement the Server Component shell and focused Client Component**

Keep credentials and initial location loading on the server where practical; place date/location interactions in the smallest client boundary; reuse Recharts and existing report-state conventions.

- [ ] **Step 4: Add responsive styling**

Add Local SEO selectors, metric cards, chart, query table, and state styles without changing unrelated dashboard pages.

- [ ] **Step 5: Verify component and repository checks**

Run: `npm test -- --run tests/components/local-seo/gbp-analytics.test.tsx && npm run check && npm run build`
Expected: tests pass, lint/typecheck exit 0, and production build succeeds.

- [ ] **Step 6: Commit**

Run: `git add "app/(dashboard)/local-seo/analytics/page.tsx" components/local-seo app/globals.css tests/components/local-seo && git commit -m "feat: add GBP analytics workspace"`

### Task 8: Document and verify the GBP foundation

**Files:**
- Modify: `README.md`
- Modify: `docs/API_INTEGRATION.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: completed Tasks 1-7.
- Produces: operator setup for Google API approval, PostgreSQL migration, one-time reauthorization, and feature limitations.

- [ ] **Step 1: Update operator documentation**

Document required Google APIs, the `business.manage` scope, approval prerequisites, PostgreSQL requirement, migration commands, reconnection procedure, supported metrics, cache behavior, and the boundary between GBP analytics and third-party rankings.

- [ ] **Step 2: Run full verification**

Run: `npm test -- --run && npm run check && npm run build && git diff --check`
Expected: all tests pass, lint/typecheck and build exit 0, and diff check reports no errors.

- [ ] **Step 3: Commit**

Run: `git add README.md docs/API_INTEGRATION.md docs/DATA_MODEL.md docs/ROADMAP.md && git commit -m "docs: document GBP analytics setup"`

