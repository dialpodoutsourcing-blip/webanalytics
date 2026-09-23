# Web Analytics Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal Next.js portal that authenticates one shared team login, connects one Google account, and reports Search Console and CrUX data across accessible properties.

**Architecture:** A single Next.js App Router application owns the browser UI and server-only route handlers. Focused services handle sessions, OAuth, Google adapters, caching, and Prisma persistence; browser components consume normalized internal types and never receive secrets or Google tokens.

**Tech Stack:** Node.js, Next.js App Router, TypeScript, Tailwind CSS, Prisma, SQLite, Google APIs Node.js client, Zod, Recharts, Vitest, Testing Library, and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-web-analytics-portal-design.md`

## Global Constraints

- Phase 1 integrates Google Search Console and CrUX, not Google Analytics 4 or live GBP ranking data.
- Use one environment-backed shared portal login and one connected Google authorization.
- Initial local portal username and password are both `admin`; warn that deployment credentials must be changed.
- Google OAuth uses offline authorization and read-only Search Console access.
- Secrets, tokens, `.env`, SQLite files, and detailed upstream errors remain server-only.
- Use SQLite only on a Node.js host with persistent disk.
- Do not push to GitHub or perform deployment work.
- Unsupported Search Console features must be identified honestly; never synthesize a full Page Indexing report.
- Build accessible loading, empty, insufficient-data, stale-data, authorization, quota, and upstream-failure states.

## Review Focus

- A URL-prefix property must reject lookalike URLs such as `https://example.com.evil.test/`; Task 7 pins URL membership validation.
- A domain property must accept valid subdomains but reject suffix tricks; Task 7 pins domain-property validation.
- Google may omit a refresh token on reconnection; Task 3 verifies the stored refresh token is retained when the callback omits it.
- CrUX may return no record for a valid origin; Task 8 verifies that this becomes `insufficient-data`, never zeros or an error page.
- A Google request may fail after cached data expires; Task 4 verifies that usable stale data is returned with a visible stale flag.

---

## Planned File Structure

```text
app/
  (auth)/login/page.tsx                 shared portal login
  (dashboard)/layout.tsx                protected shell
  (dashboard)/page.tsx                  overview
  (dashboard)/performance/page.tsx      performance report
  (dashboard)/indexing/page.tsx         sitemap/indexing limitations
  (dashboard)/inspect/page.tsx          URL inspection
  (dashboard)/vitals/page.tsx           CrUX report
  (dashboard)/settings/page.tsx         connection/cache status
  api/auth/login/route.ts                establish portal session
  api/auth/logout/route.ts               clear portal session
  api/auth/google/start/route.ts         begin OAuth
  api/auth/google/callback/route.ts      finish OAuth
  api/google/disconnect/route.ts         remove Google authorization
  api/properties/route.ts                property list
  api/performance/route.ts               normalized Search Analytics
  api/sitemaps/route.ts                  normalized sitemaps
  api/inspect/route.ts                   URL inspection
  api/vitals/route.ts                    normalized CrUX data
  api/cache/refresh/route.ts             targeted invalidation
components/
  app-shell.tsx                          sidebar/header shell
  property-selector.tsx                  active Search Console property
  report-state.tsx                       shared status rendering
  metric-card.tsx                        dashboard metric primitive
  performance-chart.tsx                 trend visualization
  performance-table.tsx                 breakdown table
  vitals-card.tsx                        CWV status primitive
features/
  auth/credentials.ts                    credential verification
  auth/session.ts                        signed session operations
  google/oauth.ts                        OAuth client and token lifecycle
  google/search-console.ts               Search Console adapter
  google/crux.ts                         CrUX adapter
  google/property-url.ts                 property/URL validation
  reports/cache.ts                       cached loader and invalidation
  reports/performance.ts                 query parsing/normalization
  reports/sitemaps.ts                    sitemap normalization
  reports/inspection.ts                  inspection normalization
  reports/vitals.ts                      CrUX normalization
lib/
  env.ts                                 validated server environment
  prisma.ts                              singleton Prisma client
  errors.ts                              stable application errors
  result.ts                              internal result contracts
prisma/schema.prisma                     persistence model
tests/                                   Vitest unit/integration tests
e2e/                                     Playwright smoke tests
middleware.ts                            protected-route enforcement
```

### Task 1: Application foundation and environment contract

**Files:**
- Create: `package.json`, Next.js scaffold files, `vitest.config.ts`, `playwright.config.ts`
- Create: `lib/env.ts`, `lib/errors.ts`, `lib/result.ts`
- Create: `.env.example`, `.gitignore`
- Test: `tests/lib/env.test.ts`, `tests/lib/errors.test.ts`

**Interfaces:**
- Produces: `env` with validated server values; `AppErrorCode`, `AppError`; `ApiResult<T>`.
- Consumes: none.

- [ ] **Step 1: Scaffold the application and install runtime/test dependencies**

Run `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm`, preserving the existing `README.md` and `docs/` if the scaffolder prompts. Then install `zod @prisma/client prisma googleapis recharts jose` and development dependencies `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test`.

- [ ] **Step 2: Write failing environment and error-contract tests**

Create `tests/lib/env.test.ts` that calls an exported `parseEnv(record)` and asserts missing `SESSION_SECRET` fails, `PORTAL_USERNAME=admin` parses, and production rejects `PORTAL_PASSWORD=admin`. Create `tests/lib/errors.test.ts` asserting `toPublicError(new AppError('QUOTA_EXCEEDED', 'raw detail'))` returns `{ code: 'QUOTA_EXCEEDED', message: 'Google API quota has been reached. Try again later.' }` without raw detail.

- [ ] **Step 3: Verify the tests fail**

Run `npm test -- --run tests/lib/env.test.ts tests/lib/errors.test.ts`. Expected: FAIL because `lib/env.ts` and `lib/errors.ts` do not exist.

- [ ] **Step 4: Implement the minimal contracts**

Implement `parseEnv` with Zod for `NODE_ENV`, portal credentials, `SESSION_SECRET`, `APP_URL`, `DATABASE_URL`, Google OAuth values, CrUX key, and token-encryption key. Export a lazily evaluated `getEnv()` so test imports do not require real secrets. Define `AppErrorCode` using the nine codes in the architecture document, an `AppError` class carrying `code`, `cause`, and `retryable`, and `toPublicError`. Define `ApiResult<T> = { ok: true; data: T; stale?: boolean } | { ok: false; error: PublicError }`.

- [ ] **Step 5: Add scripts and safe environment files**

Add `test`, `test:watch`, `test:e2e`, `typecheck`, and `check` scripts. Put placeholders in `.env.example`; ignore `.env*` except `.env.example`, `*.db`, `*.db-journal`, `.next`, coverage, logs, and Playwright artifacts.

- [ ] **Step 6: Verify foundation quality**

Run `npm test -- --run tests/lib/env.test.ts tests/lib/errors.test.ts`, `npm run typecheck`, and `npm run lint`. Expected: all pass.

- [ ] **Step 7: Commit the milestone when a local Git repository exists**

Run `git add package.json package-lock.json app lib tests .env.example .gitignore *.config.* tsconfig.json && git commit -m "chore: scaffold analytics portal"`. If Git has not been initialized, record the skipped commit in the execution notes and continue without initializing or pushing a repository.

### Task 2: Persistence, shared login, and protected shell

**Files:**
- Create: `prisma/schema.prisma`, `lib/prisma.ts`
- Create: `features/auth/credentials.ts`, `features/auth/session.ts`, `middleware.ts`
- Create: `app/(auth)/login/page.tsx`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`
- Create: `app/(dashboard)/layout.tsx`, `components/app-shell.tsx`
- Test: `tests/auth/credentials.test.ts`, `tests/auth/session.test.ts`, `tests/auth/routes.test.ts`

**Interfaces:**
- Consumes: `getEnv()`, `AppError`, `ApiResult<T>` from Task 1.
- Produces: `verifyPortalCredentials(username, password): boolean`; `createPortalSession()`, `readPortalSession()`, `clearPortalSession()`; `prisma`; protected dashboard shell.

- [ ] **Step 1: Write authentication tests first**

Test exact valid credentials, invalid username/password, empty inputs, signed-session round trip, expired session rejection, and tampered cookie rejection. Test the login route returns 401 with a generic message for bad credentials and a secure session cookie for good credentials.

- [ ] **Step 2: Verify authentication tests fail**

Run `npm test -- --run tests/auth`. Expected: FAIL on missing authentication modules.

- [ ] **Step 3: Define the Prisma schema and migrate**

Define `GoogleConnection`, `AppSetting`, `CachedReport`, and `OAuthState` exactly as described in `docs/DATA_MODEL.md`, using JSON strings where SQLite cannot represent typed JSON. Run `npx prisma migrate dev --name init` and `npx prisma generate`.

- [ ] **Step 4: Implement credential and session services**

Use constant-time byte comparison when lengths match. Sign a compact session containing `{ authenticated: true, exp: number }` with `jose` and `SESSION_SECRET`; store it in an HTTP-only, `SameSite=Lax`, path `/` cookie, adding `Secure` in production. Do not store the password or username in the session.

- [ ] **Step 5: Implement login/logout routes and middleware**

Validate form/JSON inputs, return a generic invalid-credentials error, and redirect authenticated users to `/`. Middleware allows `/login`, login/logout endpoints, Google OAuth callback, and static assets while redirecting unauthenticated dashboard requests to `/login`.

- [ ] **Step 6: Build the protected application shell**

Create sidebar entries for Overview, Performance, Indexing & Sitemaps, URL Inspection, Core Web Vitals, and Settings. Add a logout control and a temporary connection/property status region. Use semantic navigation and visible keyboard focus.

- [ ] **Step 7: Run tests and static checks**

Run `npm test -- --run tests/auth`, `npm run typecheck`, and `npm run lint`. Expected: all pass.

- [ ] **Step 8: Commit**

Run `git add prisma lib features/auth middleware.ts app components tests/auth && git commit -m "feat: add shared portal authentication"`, subject to the existing-repository rule in Task 1.

### Task 3: One-time Google OAuth and connection settings

**Files:**
- Create: `features/google/oauth.ts`, `features/google/token-crypto.ts`
- Create: `app/api/auth/google/start/route.ts`, `app/api/auth/google/callback/route.ts`, `app/api/google/disconnect/route.ts`
- Create: `app/(dashboard)/settings/page.tsx`
- Test: `tests/google/oauth.test.ts`, `tests/google/token-crypto.test.ts`, `tests/google/oauth-routes.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getEnv()`, `AppError`, portal session.
- Produces: `getAuthorizedGoogleClient(): Promise<OAuth2Client>`; `getGoogleConnectionStatus()`; `disconnectGoogle()`.

- [ ] **Step 1: Write OAuth lifecycle tests**

Test authorization URL parameters include the read-only webmasters scope, `access_type=offline`, `prompt=consent`, and hashed expiring state. Test callback state mismatch, expired state, successful token persistence, encrypted refresh-token round trip, and the review-focus case where a callback omits `refresh_token` but an existing stored token remains unchanged.

- [ ] **Step 2: Verify OAuth tests fail**

Run `npm test -- --run tests/google/oauth.test.ts tests/google/token-crypto.test.ts tests/google/oauth-routes.test.ts`. Expected: FAIL on missing modules.

- [ ] **Step 3: Implement token encryption and OAuth state**

Use AES-256-GCM with a decoded 32-byte `TOKEN_ENCRYPTION_KEY`; store version, IV, auth tag, and ciphertext in one encoded string. Generate 32 random bytes for OAuth state, persist only its SHA-256 hash with a ten-minute expiry, validate once, and delete it whether the exchange succeeds or fails.

- [ ] **Step 4: Implement authorization and token lifecycle**

Create the `google.auth.OAuth2` client from environment values. Exchange the callback code, encrypt/persist tokens and scope, preserve an existing refresh token when omitted, refresh access as needed, translate revoked grants to `GOOGLE_REAUTH_REQUIRED`, and never serialize tokens to callers.

- [ ] **Step 5: Implement routes and settings UI**

The start route requires a portal session and redirects to Google. The callback validates state then redirects to `/settings?connected=1` or a safe error code. Disconnect deletes the connection and related cached reports after confirmation. Settings displays presence/status only, never token values.

- [ ] **Step 6: Run verification**

Run `npm test -- --run tests/google`, `npm run typecheck`, and `npm run lint`. Expected: all pass.

- [ ] **Step 7: Commit**

Run `git add features/google app/api/auth/google app/api/google app/\(dashboard\)/settings tests/google && git commit -m "feat: connect Google Search Console with OAuth"`, subject to the existing-repository rule.

### Task 4: Cache service and Search Console property selection

**Files:**
- Create: `features/reports/cache.ts`, `features/google/search-console.ts`
- Create: `app/api/properties/route.ts`, `components/property-selector.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Test: `tests/reports/cache.test.ts`, `tests/google/search-console.test.ts`, `tests/components/property-selector.test.tsx`

**Interfaces:**
- Consumes: authorized Google client, Prisma, `ApiResult<T>`.
- Produces: `withReportCache<T>(request, loader): Promise<{ data: T; stale: boolean; fetchedAt: Date }>`; `listProperties()`; active property setting.

- [ ] **Step 1: Write cache and property tests**

Test deterministic keys independent of object property order, fresh cache hits, misses, targeted invalidation, and the review-focus behavior: an expired cached payload plus retryable upstream failure returns stale data with `stale: true`. Mock Sites API results for domain and URL-prefix properties and verify normalization.

- [ ] **Step 2: Verify tests fail**

Run `npm test -- --run tests/reports/cache.test.ts tests/google/search-console.test.ts tests/components/property-selector.test.tsx`. Expected: FAIL on missing modules.

- [ ] **Step 3: Implement generic cached loading**

Canonicalize validated parameters, hash the canonical string, store normalized JSON with fetched/expiry times, and use stale fallback only for retryable upstream errors. Implement invalidation by report type and optional property.

- [ ] **Step 4: Implement property listing and selection**

Call the Search Console Sites list operation, normalize to `{ id, label, type, permissionLevel }`, cache the list, and persist the selected property as `AppSetting.selectedProperty`. Reject attempts to select an ID absent from the current accessible list.

- [ ] **Step 5: Build the selector and states**

Show connection-required, loading, empty, selected, stale, and error states. A selection updates the server preference and refreshes the current route without exposing tokens.

- [ ] **Step 6: Verify and commit**

Run `npm test -- --run tests/reports/cache.test.ts tests/google/search-console.test.ts tests/components/property-selector.test.tsx`, `npm run typecheck`, and `npm run lint`. Then commit as `feat: add Search Console property selection` when Git exists.

### Task 5: Search performance service and dashboard

**Files:**
- Create: `features/reports/performance.ts`, `app/api/performance/route.ts`
- Create: `components/metric-card.tsx`, `components/performance-chart.tsx`, `components/performance-table.tsx`, `components/report-state.tsx`
- Create: `app/(dashboard)/performance/page.tsx`
- Modify: `app/(dashboard)/page.tsx`
- Test: `tests/reports/performance.test.ts`, `tests/api/performance.test.ts`, `tests/components/performance-table.test.tsx`

**Interfaces:**
- Consumes: Search Console adapter, cache service, selected property.
- Produces: `parsePerformanceRequest(input)`; `getPerformanceReport(request): Promise<PerformanceReport>` where rows contain keys, clicks, impressions, ctr, and position.

- [ ] **Step 1: Write performance tests**

Test 7-day/28-day/3-month ranges, invalid reversed/future dates, allowed dimensions, rejected dimension/filter values, maximum page size, CTR/position preservation, empty rows, and Google quota error translation. Test table sorting and explicit empty/stale states.

- [ ] **Step 2: Verify tests fail**

Run `npm test -- --run tests/reports/performance.test.ts tests/api/performance.test.ts tests/components/performance-table.test.tsx`. Expected: FAIL on missing report modules.

- [ ] **Step 3: Implement request parsing and adapter call**

Use Zod to accept property, start/end dates, one supported grouping, supported search type, validated filters, `startRow`, and `rowLimit` capped at 1,000 per UI request. Map the internal request to Search Analytics while preserving Google's aggregation semantics.

- [ ] **Step 4: Build normalized overview and detail responses**

Return totals, daily series, and rows with freshness metadata. Overview requests fetch totals, date series, top queries, and top pages through cached service calls; no metric is inferred from missing data.

- [ ] **Step 5: Build the UI**

Add date presets, metric toggles, Recharts trend chart, dimension tabs, sortable accessible table, pagination, freshness label, and manual refresh. Implement `ReportState` for loading, empty, stale, quota, reauthorization, and temporary failure states.

- [ ] **Step 6: Verify and commit**

Run the Task 5 tests, `npm run typecheck`, and `npm run lint`. Commit as `feat: add Search Console performance reporting` when Git exists.

### Task 6: Sitemap and indexing-information page

**Files:**
- Create: `features/reports/sitemaps.ts`, `app/api/sitemaps/route.ts`
- Create: `app/(dashboard)/indexing/page.tsx`
- Test: `tests/reports/sitemaps.test.ts`, `tests/api/sitemaps.test.ts`, `tests/pages/indexing.test.tsx`

**Interfaces:**
- Consumes: Search Console adapter, cache service, selected property.
- Produces: `getSitemaps(propertyId): Promise<SitemapReport>` with returned type/status/date/warning/error/content fields.

- [ ] **Step 1: Write sitemap normalization and UI tests**

Mock complete, partial, and empty sitemap responses. Verify invalid/missing dates remain absent, warning/error counts are preserved, nested content counts render, and the page always states that the complete Page Indexing report is unavailable through this API.

- [ ] **Step 2: Verify tests fail**

Run `npm test -- --run tests/reports/sitemaps.test.ts tests/api/sitemaps.test.ts tests/pages/indexing.test.tsx`. Expected: FAIL on missing modules.

- [ ] **Step 3: Implement service, endpoint, and page**

List sitemaps read-only, normalize only returned fields, cache by property, render a responsive table, and build a correctly encoded link to the selected property in Search Console. Do not add submit/delete actions.

- [ ] **Step 4: Verify and commit**

Run the Task 6 tests, `npm run typecheck`, and `npm run lint`. Commit as `feat: add sitemap and indexing information` when Git exists.

### Task 7: URL inspection and strict property membership

**Files:**
- Create: `features/google/property-url.ts`, `features/reports/inspection.ts`
- Create: `app/api/inspect/route.ts`, `app/(dashboard)/inspect/page.tsx`
- Test: `tests/google/property-url.test.ts`, `tests/reports/inspection.test.ts`, `tests/api/inspect.test.ts`

**Interfaces:**
- Consumes: Search Console adapter, cache service, selected property.
- Produces: `urlBelongsToProperty(url, propertyId): boolean`; `inspectUrl(input): Promise<InspectionReport>`.

- [ ] **Step 1: Write exhaustive membership tests**

For URL-prefix properties test exact origin/path membership, HTTP/HTTPS mismatch, port mismatch, sibling path, encoded path, credentials in URL, and the lookalike host `example.com.evil.test`. For `sc-domain:example.com`, accept the apex and real subdomains, reject `notexample.com`, `example.com.evil.test`, non-HTTP schemes, malformed URLs, and domains with deceptive user-info.

- [ ] **Step 2: Write inspection tests**

Test normalization of verdict, coverage, robots, indexing, fetch, crawl time, canonicals, agent, sitemaps, referring URLs, rich results, and absent optional sections. Verify outside-property input is rejected before the Google mock is called.

- [ ] **Step 3: Verify tests fail**

Run `npm test -- --run tests/google/property-url.test.ts tests/reports/inspection.test.ts tests/api/inspect.test.ts`. Expected: FAIL on missing modules.

- [ ] **Step 4: Implement strict validation and inspection**

Parse URLs with the platform URL parser, compare normalized origins and path-prefix boundaries for URL-prefix properties, and compare exact registrable hostname suffix boundaries for domain properties. Call `urlInspection.index.inspect` only after validation, requesting `en-US`, and normalize optional result sections without inventing values.

- [ ] **Step 5: Build the inspection page**

Add a labeled URL form, pending state, summary verdict, crawl/index details, canonical comparison, known sitemaps/referrers, rich-result issues, Google result link, and a persistent notice that this is the indexed version—not a live test or indexing request.

- [ ] **Step 6: Verify and commit**

Run the Task 7 tests, `npm run typecheck`, and `npm run lint`. Commit as `feat: add URL inspection` when Git exists.

### Task 8: Core Web Vitals through CrUX

**Files:**
- Create: `features/google/crux.ts`, `features/reports/vitals.ts`
- Create: `app/api/vitals/route.ts`, `components/vitals-card.tsx`, `app/(dashboard)/vitals/page.tsx`
- Modify: `app/(dashboard)/page.tsx`
- Test: `tests/google/crux.test.ts`, `tests/reports/vitals.test.ts`, `tests/components/vitals-card.test.tsx`

**Interfaces:**
- Consumes: cache service, CrUX API key, selected property/validated URL.
- Produces: `getVitals({ mode, value, formFactor? }): Promise<VitalsReport>` with status `available | insufficient-data` and normalized LCP/INP/CLS.

- [ ] **Step 1: Write CrUX and vitals tests**

Test origin and URL request bodies, desktop/mobile/all form factors, LCP/INP/CLS p75 and histogram normalization, threshold status, partial metrics, and the review-focus case: an upstream 404/no-record response returns `{ status: 'insufficient-data', metrics: [] }` rather than zeros or a failed result.

- [ ] **Step 2: Verify tests fail**

Run `npm test -- --run tests/google/crux.test.ts tests/reports/vitals.test.ts tests/components/vitals-card.test.tsx`. Expected: FAIL on missing modules.

- [ ] **Step 3: Implement the CrUX adapter and report service**

POST to the official CrUX record endpoint with one origin or URL, translate only recognized metrics, calculate display statuses from returned histogram thresholds, cache results for up to one day, and distinguish no-record from quota or service errors.

- [ ] **Step 4: Build Core Web Vitals UI**

Add origin/URL mode, optional form factor, LCP/INP/CLS cards with p75 and labeled distributions, plain-language definitions, rolling-field-data explanation, and a strong insufficient-data state. Add an origin summary to Overview.

- [ ] **Step 5: Verify and commit**

Run the Task 8 tests, `npm run typecheck`, and `npm run lint`. Commit as `feat: add Core Web Vitals reporting` when Git exists.

### Task 9: Refresh controls, operational hardening, and end-to-end verification

**Files:**
- Create: `app/api/cache/refresh/route.ts`, `features/auth/rate-limit.ts`
- Modify: login route, dashboard pages, settings page, Next.js configuration, `README.md`
- Create: `e2e/auth.spec.ts`, `e2e/dashboard.spec.ts`
- Test: `tests/auth/rate-limit.test.ts`, `tests/api/cache-refresh.test.ts`

**Interfaces:**
- Consumes: cache invalidation, session, all phase 1 pages.
- Produces: targeted refresh endpoint, login throttling, security headers, executable setup guide, passing release checks.

- [ ] **Step 1: Write hardening tests**

Test repeated failed logins receive 429 after the configured threshold and recover after the window; successful login resets the key. Test refresh rejects an unrecognized report/property, requires authentication, invalidates only the requested report/property, and returns a new freshness timestamp after reload.

- [ ] **Step 2: Write Playwright smoke tests**

Cover unauthenticated redirect, invalid login, valid login, protected navigation, logout, disconnected-Google first-run state, and mocked connected states for overview, performance empty data, URL inspection failure, and CrUX insufficient data.

- [ ] **Step 3: Verify new tests fail**

Run `npm test -- --run tests/auth/rate-limit.test.ts tests/api/cache-refresh.test.ts` and `npm run test:e2e`. Expected: hardening behavior or fixtures are missing.

- [ ] **Step 4: Implement throttling, refresh, and headers**

Add a bounded in-memory login limiter suitable for the single-process initial deployment, targeted cache invalidation, Content-Security-Policy compatible with the chosen chart output, frame denial, content-type protection, referrer policy, and production HSTS. Document that distributed deployment requires a shared rate-limit store.

- [ ] **Step 5: Complete the setup guide**

Update `README.md` with prerequisites, install/migrate commands, `.env` setup, Google Cloud OAuth and API enablement steps, exact local callback URI, `npm run dev`, test commands, initial `admin` warning, persistent-disk requirement, and the explicit no-GA4/no-live-GBP phase boundary.

- [ ] **Step 6: Run the full release gate**

Run `npx prisma validate`, `npm run check`, `npm test -- --run`, `npm run build`, and `npm run test:e2e`. Start the production build locally and verify login, Google connection screen, and all navigation routes render without console/server errors.

- [ ] **Step 7: Perform secret and scope checks**

Run `rg -n "(client_secret|refresh_token|PORTAL_PASSWORD|TOKEN_ENCRYPTION_KEY)" --glob '!package-lock.json' --glob '!.env.example' --glob '!docs/**' .` and inspect every match. Verify `.env`, `*.db`, build output, and test artifacts are excluded. Confirm there is no GA4 or live GBP implementation.

- [ ] **Step 8: Final commit when Git exists**

Run `git add app components features lib tests e2e README.md next.config.* && git commit -m "feat: complete internal Search Console portal"`. Do not initialize a repository or push a remote unless the owner separately requests it.

## Completion Criteria

- An internal user can log in with environment-backed credentials and log out.
- The owner can complete Google authorization once and reconnect after revocation.
- Every accessible Search Console property can be selected safely.
- Overview and detailed performance reports display normalized, cached data and honest data states.
- Sitemap information is available without implying full indexing-report parity.
- URL inspection strictly enforces property membership and reports indexed-version results.
- CrUX reports LCP, INP, and CLS or an explicit insufficient-data state.
- Secrets remain server-side; production defaults reject `admin` as the password.
- Unit, integration, type, lint, build, and end-to-end checks pass.
- No GitHub push, deployment, GA4 integration, or live GBP ranking scan is performed.
