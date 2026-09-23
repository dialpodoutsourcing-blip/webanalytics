# Architecture

## 1. System shape

The portal is one full-stack Next.js application. The browser renders the dashboard and calls same-origin server routes. Server routes own authentication, Google OAuth, Google API access, data normalization, caching, and database access.

```text
Browser
  -> Next.js pages and server routes
      -> Portal session service
      -> Google OAuth service
      -> Search Console adapter
      -> CrUX adapter
      -> Cache service
      -> Prisma
          -> SQLite
```

Google credentials, OAuth tokens, session secrets, and database access never pass to browser code.

## 2. Major modules

### Web interface

Owns navigation, forms, charts, tables, filters, accessibility, and display states. It consumes normalized internal responses rather than raw Google responses.

### Portal authentication

Validates the shared environment-backed credentials, issues and verifies the portal session, and protects all non-public routes.

### Google OAuth

Builds the authorization URL, validates OAuth state, exchanges the callback code, stores tokens, refreshes access tokens, and supports disconnect/reconnect.

### Search Console adapter

Wraps property listing, Search Analytics queries, sitemap listing, and URL inspection. It hides Google client details and converts upstream errors into stable internal errors.

### CrUX adapter

Queries origin- or URL-level real-user performance data and normalizes LCP, INP, and CLS. Missing field data is a valid result, not an application error.

### Cache service

Builds deterministic keys from property, report, filters, and date range. It returns usable cached data within its time-to-live and supports targeted invalidation from the refresh action.

### Persistence

Prisma provides typed access to SQLite for OAuth credentials, selected-property preferences, cached responses, and operational metadata.

## 3. Request flow

1. Middleware checks the portal session.
2. A page or internal endpoint validates the property, dates, filters, and URL.
3. The service checks for a fresh cached result.
4. On a cache miss, the relevant Google adapter requests data.
5. The adapter normalizes the response.
6. The service stores the normalized result and freshness metadata.
7. The browser receives a display-safe response.

## 4. Boundaries

- UI components do not call Google directly.
- Google adapters do not format UI labels or chart objects.
- Route handlers remain thin and delegate business logic to services.
- Database access occurs through repositories/services, not arbitrary components.
- External API response types are translated into internal domain types.

## 5. Caching strategy

Initial cache durations are implementation-time configuration values, with conservative defaults:

- Property list: several hours.
- Finalized historical performance: several hours.
- Recent or partial performance data: shorter duration.
- Sitemap data: several hours.
- URL inspection: short duration and explicit refresh support.
- CrUX data: up to one day because the upstream dataset updates daily.

Manual refresh invalidates only data relevant to the current property/report. Stale cached data may be displayed with a warning when an upstream request temporarily fails.

## 6. Error model

Internal errors use stable categories:

- `AUTH_REQUIRED`
- `GOOGLE_NOT_CONNECTED`
- `GOOGLE_REAUTH_REQUIRED`
- `PROPERTY_FORBIDDEN`
- `INVALID_INPUT`
- `NO_DATA`
- `QUOTA_EXCEEDED`
- `UPSTREAM_UNAVAILABLE`
- `INTERNAL_ERROR`

Logs retain diagnostic details on the server. Browser messages remain useful without leaking credentials, tokens, stack traces, or raw upstream payloads.

## 7. Deployment assumptions

Phase 1 targets a conventional Node.js host with persistent disk because SQLite and the stored OAuth refresh token require durable storage. A serverless host with an ephemeral filesystem is not compatible unless SQLite is replaced by a managed database.

