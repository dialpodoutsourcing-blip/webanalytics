# Local SEO Geo-Grid and GBP Analytics Design

## Purpose

Add a self-hosted Local SEO area to the existing Web Analytics Portal. Internal users should be able to select any Google Business Profile location managed by the connected owner account, review official GBP performance analytics, approve keywords to track, run or schedule geographic rank scans, and compare results over time.

The geo-grid experience will adapt MIT-licensed patterns from the open-source SEO Playground project. DataForSEO will supply Google Maps ranking results. Google Business Profile APIs will remain the authoritative source for owned locations and performance metrics.

## Success criteria

- Every accessible GBP location appears in a shared location selector.
- Each location has independent analytics, tracked keywords, schedules, and scan history.
- Users can approve suggested keywords, add their own keywords, pause tracking, and run a scan manually.
- The default 7 x 7 grid displays a numeric rank at every coordinate on an interactive map.
- Weekly scans run for active locations and approved keywords without depending on a browser session.
- Page views read stored results and never create paid DataForSEO requests.
- Users can understand scan cost before execution and administrators can cap spending.
- GBP analytics and geo-grid results fail independently and expose clear recovery states.

## Scope

### Included

- All GBP locations available to the connected Google account.
- Official GBP daily performance metrics and monthly search-query impressions.
- Keyword suggestions derived from GBP search-query data, subject to explicit user approval.
- Manual and weekly scheduled geo-grid scans.
- Configurable odd grid sizes, with 7 x 7 as the default, and configurable radius.
- Current results, historical comparisons, competitor visibility, and accessible tabular results.
- Server-side cost estimation, cost caps, idempotency, caching, and partial retries.
- MIT attribution for adapted open-source work.

### Excluded from the first release

- Editing GBP business information, posts, reviews, or media.
- Triggering a paid scan simply by opening or refreshing a page.
- Supporting arbitrary rank providers in the first implementation.
- White-label public reports or unauthenticated share links.
- Automated SEO recommendations or AI-generated business changes.
- Copying SEO Playground as a separate application or preserving its entire feature set.

## Architecture

The portal remains one full-stack Next.js App Router application. A new Local SEO navigation group contains two protected pages:

- **Geo-Grid Rankings** selects a GBP location and keyword, manages tracking settings, starts scans, displays progress and results, and compares scan dates.
- **GBP Analytics** selects a GBP location and date range and displays official performance time series and monthly search-query impressions.

The existing shared Google authorization will request the `https://www.googleapis.com/auth/business.manage` scope in addition to the existing Search Console scope. Because the stored grant lacks this scope, the portal owner must reconnect once after deployment. Google credentials and DataForSEO credentials remain server-only.

Server-side modules have narrow responsibilities:

- The GBP adapter lists accounts and locations and retrieves performance reports.
- The DataForSEO adapter submits Google Maps SERP tasks, polls or receives completed results, and returns provider responses without UI formatting.
- The grid service generates coordinates around a location and calculates scan fingerprints and estimated cost.
- The scan coordinator validates limits, creates jobs, submits point tasks, resumes incomplete work, and finalizes derived metrics.
- Normalizers translate both providers into stable internal domain types.
- Route handlers authorize requests, validate input, call services, and return the portal's existing result envelope.

Browser components consume normalized internal responses only. Long-running scans do not hold a browser request open. The initial request creates or reuses a scan job, and the interface polls its status until it reaches a terminal state.

## Open-source use

SEO Playground is the primary reference because its MIT license and Next.js/React/Leaflet stack align with this portal. Reused or adapted portions must retain the required copyright and license notice. Only the geo-grid concepts and code that serve this feature will be brought into the portal; unrelated SEO Playground modules will not be imported.

Leaflet and OpenStreetMap will render the interactive map. The UI must preserve OpenStreetMap attribution and comply with the selected tile provider's usage policy. Production traffic must use an appropriate tile service rather than assuming the public OpenStreetMap tile server is an unlimited commercial CDN.

## Data model

The persistence layer adds the following logical records. Exact Prisma names may follow existing repository conventions during planning.

### Business location

Stores the Google resource name and stable location identifier, account identifier, title, address, coordinates, primary category, open/closed state, last synchronization time, and active tracking state. Google remains authoritative; synchronization updates mutable fields without deleting historical scans.

### Tracked keyword

Belongs to one business location. Stores the keyword, source (`GBP_SUGGESTED` or `MANUAL`), approval state, active state, schedule, default grid size, radius, language, and creation/update timestamps. The location and normalized keyword combination is unique.

### Scan job

Belongs to a location and tracked keyword. Stores the immutable scan configuration, fingerprint/idempotency key, provider method, point count, estimated and actual cost, status, progress counts, requested origin, timestamps, and a safe failure classification. A job is immutable after submission except for lifecycle and aggregate fields.

### Grid point result

Belongs to a scan job. Stores row and column, latitude and longitude, target rank or not-found status, target Google Maps identifier, captured competitors, provider task identifier, point status, cost, and timestamps. The scan, row, and column combination is unique.

### GBP analytics cache

Stores normalized performance series and keyword-impression data by location, report type, and date range. Cached provider data is disposable and may be refreshed without affecting geo-grid history.

## Location synchronization

The portal retrieves every location the connected owner can manage, including locations reached indirectly through business groups when supported by the Google endpoint. Only locations that contain usable coordinates can run a geo-grid scan. Locations without coordinates remain available for analytics and show a clear setup message for rank tracking.

Closed locations remain visible in historical reports but are inactive for new scheduled scans by default. Newly discovered open locations are shown but do not begin paid tracking until at least one keyword is approved.

## Keyword workflow

Monthly GBP search-query impressions provide suggestions for each location. Suggestions never become billable tracking targets automatically. A user can approve a suggestion, enter a manual keyword, pause a keyword, or remove it from future schedules. Removing or pausing a keyword preserves its prior scans.

Keywords are normalized for duplicate detection while preserving their display text. The first release tracks unmodified search phrases; it does not automatically append city names or other geographic modifiers.

## Geo-grid scan lifecycle

1. A user approves a keyword or requests a manual scan.
2. The server validates the location, keyword, grid size, radius, provider configuration, and account-level spending policy.
3. The grid service generates evenly spaced coordinates around the business using latitude-aware longitude offsets.
4. The server displays or records the point count and estimated maximum cost.
5. The coordinator creates a scan job using a fingerprint derived from location, keyword, grid configuration, language, provider method, and schedule window.
6. Duplicate submissions return the existing job rather than creating new provider charges.
7. Each coordinate becomes a DataForSEO Google Maps SERP task. The target is matched by stable Google Maps identifier when available; a normalized name/address fallback is used only when necessary and is recorded as lower-confidence evidence.
8. Point results are persisted independently. Transient failures can retry without re-running successful points.
9. When every point is terminal, the coordinator calculates aggregates and marks the scan complete or partially complete.
10. The UI reads stored results and may poll active job status. It does not contact DataForSEO directly.

The default grid is 7 x 7. Only odd grid sizes are accepted so one point represents the business center. Grid size and radius limits will be configured server-side to prevent unexpectedly large scans.

## Scheduling and cost controls

Every active location-keyword pair is eligible for one weekly scan. A protected scheduler endpoint finds due work and creates idempotent jobs. The deployment scheduler calls this endpoint; users do not need to leave the application open.

Cost protections include:

- An estimate before every manual scan.
- A per-scan maximum cost.
- Weekly and monthly account-level spending limits.
- A maximum number of submitted points per scheduler invocation.
- Idempotency for manual requests, scheduler retries, and double-clicks.
- Actual provider cost stored for reconciliation.
- A hard stop before submission when credentials or cost policy are missing.

Revisiting a report, changing filters, or refreshing the browser never starts a scan.

## Derived metrics

The geo-grid report calculates metrics from completed point results:

- Average grid rank: arithmetic mean of found ranks, with not-found points reported separately rather than silently assigned an arbitrary rank.
- Top-3 coverage: completed points ranked 1 through 3 divided by all successfully queried points.
- Top-10 coverage: completed points ranked 1 through 10 divided by all successfully queried points.
- Share of local visibility: a documented rank-weighted score across successfully queried points.
- Competitor presence: frequency and average position for competitors observed across the grid.
- Change: comparable metric and point-level differences from the most recent prior scan with the same configuration.

Partially complete scans display their completion rate and do not masquerade as directly comparable complete scans.

## User interface

The map-first report follows the supplied reference while using the portal's established visual system.

The control area contains a GBP location selector, keyword selector, scan-date selector, grid size, radius, and a manual scan action. The summary displays business name, address, scan time, average rank, top-3 coverage, top-10 coverage, visibility score, completion state, and actual cost.

The Leaflet map displays a marker for every grid coordinate:

- Green for ranks 1-3.
- Amber for ranks 4-10.
- Red for ranks 11-20.
- Gray for ranks below the tracked depth or not found.

Every marker includes the numeric rank or an explicit not-found symbol. Selecting a marker reveals coordinates, target evidence, and leading competitors. Color is never the only representation of status.

A table beneath or beside the map provides the same point data for keyboard, screen-reader, export, and small-screen use. Historical comparison highlights improved, declined, unchanged, newly found, and newly lost points using both text/icons and color.

GBP Analytics presents summary cards, daily trend charts, channel breakdowns supported by the API, and monthly search-query impressions. It clearly distinguishes Google's official owned-profile analytics from third-party geo-grid rank observations.

## Error handling

GBP and DataForSEO failures use stable internal error codes and safe messages. Raw provider responses, tokens, credentials, and stack traces never reach the browser.

The interface distinguishes:

- Missing or insufficient Google OAuth scope.
- Business Profile API access not approved or not enabled.
- No GBP locations or no location coordinates.
- Missing DataForSEO configuration or insufficient balance.
- Cost-limit rejection before submission.
- Provider throttling, timeout, or outage.
- Active, queued, partial, failed, and stale scan states.
- Empty GBP analytics or delayed Google data.

Completed grid points remain usable when other points fail. Retrying a partial scan targets only retryable failed points. Permanent input failures require a corrected configuration and a new scan.

## Security and privacy

- Every page and internal API route uses the portal's existing session protection.
- Google refresh tokens and DataForSEO credentials remain encrypted or environment-backed server secrets.
- OAuth callbacks continue to validate short-lived state.
- Scheduler calls require a dedicated server-side secret or platform-authenticated mechanism.
- Inputs are schema-validated and bounded before provider calls.
- Logs may include internal job and provider task identifiers but never secrets or complete sensitive provider payloads.
- Only read operations are requested from GBP even though Google's current Business Profile scope is broader than read-only.

## Testing

Unit tests cover grid coordinate generation, longitude correction, fingerprints, cost estimates, input limits, target matching, rank normalization, coverage calculations, visibility scoring, and historical comparisons.

Adapter tests mock Google and DataForSEO responses, including pagination, absent metrics, missing identifiers, throttling, malformed responses, and partial failures.

Route and service tests cover session protection, OAuth scope upgrade behavior, location synchronization, keyword approval, duplicate manual submissions, scheduler idempotency, spending-limit rejection, status polling, and point-only retries.

Component tests cover location and keyword selection, map legend semantics, accessible table parity, cost confirmation, progress, stale data, partial results, and provider-specific recovery messages. Map rendering is tested at the data/marker boundary; a browser smoke test verifies the actual Leaflet integration.

No automated test makes a billable provider request. A documented, explicitly invoked smoke procedure will validate one small live grid after credentials are configured.

## Deployment requirements

- Google Business Profile API access approval for the Google Cloud project.
- Business Profile Account Management, Business Information, and Performance APIs enabled as required by the implemented endpoints.
- Reauthorization of the shared owner account with `business.manage` plus the existing Search Console scope.
- DataForSEO credentials and explicit cost-limit configuration.
- Durable production storage suitable for scan jobs and history; ephemeral local SQLite is not sufficient on serverless deployment.
- A deployment scheduler capable of invoking the protected weekly job endpoint.
- A production-appropriate map tile provider and visible attribution.

## Delivery sequence

Implementation planning should divide the work into independently verifiable stages:

1. Persistence and domain types.
2. Expanded Google authorization and GBP location synchronization.
3. GBP performance analytics and keyword suggestions.
4. Grid generation, DataForSEO adapter, and cost estimation.
5. Durable scan orchestration, scheduling, retries, and limits.
6. Geo-grid map, accessible table, metrics, and history comparison.
7. Documentation, attribution, deployment configuration, and live smoke verification.

The implementation plan must preserve this sequence so provider access and cost controls are validated before the full map interface can create live scans.
