# Web Analytics Portal Design

**Date:** 2026-09-23  
**Status:** Approved in conversation; awaiting review of this written specification

## Intent

Build a small internal portal for the owner and trusted team to review data for websites available through one Google Search Console account. Routine workflows should be simpler and more consistent than switching between properties in Search Console.

The owner requested documentation before implementation, Node.js as the runtime, one shared environment-backed portal login, and a one-time Google OAuth connection that is easy to complete. Nothing will be pushed to GitHub as part of this phase.

## Scope decision

The first reference screenshot is Google Search Console. Therefore, phase 1 integrates Google Search Console rather than Google Analytics 4.

Phase 1 includes:

- Shared internal login.
- One-time Google OAuth.
- Property selection.
- Search performance reports.
- Sitemap and API-available indexing information.
- URL inspection.
- Core Web Vitals via CrUX.
- Caching, refresh, clear error states, and tests.

The GBP local rank geo grid is a later phase. Its first iteration will render sample or imported data. Live scanning is deferred until a suitable data provider is evaluated.

## Chosen approach

Use a single Next.js application with TypeScript, Tailwind CSS, SQLite, and Prisma.

This approach was selected over a separate React/Express architecture because the portal is small and benefits from one deployable Node.js application. It was selected over server-rendered Express templates because the dashboard needs interactive charts, filters, tables, and map-oriented future work.

## Architecture

Next.js pages and components render the interface. Same-origin server routes handle the portal session, OAuth, validation, Google API requests, normalization, caching, and database operations. The browser never receives Google client secrets, OAuth tokens, database access, or portal credentials.

SQLite stores the one Google connection, encrypted refresh token, selected property, cache entries, and OAuth state when needed. The chosen deployment must provide persistent storage, or a later design change must replace SQLite with a managed database.

The application separates UI components, route handlers, domain services, external API adapters, and persistence. Google response shapes are normalized before reaching the UI.

## Authentication and authorization

The portal has one shared login whose username and password are read from environment variables. The requested development values are both `admin`. Documentation and the UI will make clear that these must be changed before deployment.

Successful login creates a signed, HTTP-only session. Every dashboard page and internal endpoint is protected. The Google authorization uses the server-side OAuth authorization-code flow, requests offline and read-only Search Console access, validates OAuth state, and retains the refresh token securely.

## Data sources

### Search Console API

- Sites service: list accessible properties.
- Search Analytics: clicks, impressions, CTR, position, dimensions, filters, and date ranges.
- Sitemaps: list sitemap information returned by Google.
- URL Inspection: inspect the version of a URL in Google's index.

The portal will not misrepresent unsupported functionality. The API does not expose a full general Page Indexing report, a live URL inspection test, or an indexing-request action.

### Chrome UX Report API

CrUX supplies LCP, INP, and CLS field data by origin or URL when enough real-user data exists. Missing records are displayed as insufficient field data. Overview data may be cached for up to one day because upstream values are based on a rolling window and update on a slower cadence than interactive requests.

## Pages

- **Login:** shared internal credential form.
- **Connect Google:** first-run authorization and connection status.
- **Overview:** performance metrics, trend, top queries/pages, sitemap/indexing summary, and origin-level Core Web Vitals.
- **Performance:** date/search filters, chart, and dimension tables.
- **Indexing & Sitemaps:** all available sitemap information plus explicit API limitations and Search Console links.
- **URL Inspection:** validated URL input and indexed-version results.
- **Core Web Vitals:** origin/URL field metrics and insufficient-data handling.
- **Settings:** connection, selected property, cache, and environment-readiness status.

## Data flow

1. The portal session is verified.
2. Inputs are validated and property access is checked.
3. The service checks a normalized cache key.
4. A cache miss calls the appropriate Google adapter.
5. The result is normalized and cached with freshness metadata.
6. Display-safe data is returned to the interface.

A manual refresh invalidates only the applicable cached data. When an upstream service temporarily fails, recent stale data may be shown with a visible warning.

## Failure behavior

The design explicitly handles invalid credentials, missing Google connection, revoked authorization, inaccessible properties, invalid date/filter combinations, URLs outside the selected property, API quota limits, upstream outages, empty Search Console results, and missing CrUX field data.

Users receive plain-language next actions. Detailed diagnostics remain in redacted server logs.

## Security

- Secrets live only in `.env` and server execution contexts.
- `.env`, SQLite files, and logs will be excluded from version control.
- OAuth state protects the callback.
- The refresh token is encrypted at rest before non-local use.
- Production uses HTTPS, secure cookies, strong credentials, login throttling, security headers, and durable restricted storage.
- No sensitive value is returned in readiness/status endpoints.

## Testing

- Unit tests for validation, normalization, metric transformations, and cache keys.
- Integration tests for session protection, OAuth callback behavior, persistence, and error translation.
- Mocked contract-style tests for Search Console and CrUX adapters.
- UI tests for login, property selection, performance filters, URL inspection, insufficient data, and authorization failures.
- Smoke tests for the protected dashboard routes.

## Delivery boundary

This document completes the approved design stage. No application code, dependency installation, deployment, or remote repository publication is authorized by this document alone. After the owner reviews and approves the written specification, the next step is a detailed implementation plan.
