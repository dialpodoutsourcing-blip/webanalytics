# Product Requirements

## 1. Product summary

The Web Analytics Portal is a small internal dashboard for the owner and internal team. It consolidates useful Google Search Console information for multiple websites into one consistent interface.

The portal is not a replacement for every Search Console screen. It presents the data available through Google's public APIs and clearly labels unavailable, delayed, or incomplete data.

## 2. Users

Phase 1 has one user class: trusted internal team members who share one portal username and password.

There are no client accounts, roles, invitations, password resets, or per-user permissions in phase 1.

## 3. Goals

- Make it easy to switch between all Search Console properties available to the connected Google account.
- Summarize organic search performance without repeatedly navigating Search Console.
- Allow detailed analysis by query, page, country, device, search appearance, and date.
- Provide individual URL inspection using Google's indexed data.
- Show Core Web Vitals using free Google data when sufficient field data exists.
- Keep setup and daily use simple for a small internal team.

## 4. Non-goals

- Replicating every private Search Console interface or report.
- Google Analytics 4 integration in phase 1.
- Multi-user identity management or client access.
- Automated GBP/local rank scanning in phase 1.
- Billing, subscriptions, white labeling, or public registration.
- Deployment or GitHub publication during the documentation phase.

## 5. Functional requirements

### 5.1 Portal authentication

- Display a login page when no valid portal session exists.
- Compare the submitted credentials with server-only environment variables.
- Create a secure, HTTP-only session after successful authentication.
- Protect every dashboard page and internal API route.
- Provide a logout action.

The initial local credentials requested by the owner are username `admin` and password `admin`. These are development defaults and must be changed before any internet-accessible deployment.

### 5.2 Google connection

- Show whether a Google account is connected.
- Provide a one-time **Connect Google** OAuth action.
- Request the minimum read-only Search Console scope needed by the portal.
- Store the resulting refresh token on the server.
- Support disconnecting and reconnecting the Google account.
- Display actionable messages for revoked or expired authorization.

### 5.3 Property selection

- List the Search Console properties accessible to the connected account.
- Show whether each property is a domain property or URL-prefix property where identifiable.
- Persist the most recently selected property as an application preference.
- Prevent requests for URLs outside the selected property.

### 5.4 Overview

- Display clicks, impressions, CTR, and average position for the selected date range.
- Show a time-series performance chart.
- Show top queries and top pages.
- Show sitemap/indexing signals available from the API.
- Show an origin-level Core Web Vitals summary when CrUX has sufficient data.
- Show data freshness and a manual refresh control.

### 5.5 Performance

- Support common ranges such as 7 days, 28 days, and 3 months, plus a valid custom range.
- Display clicks, impressions, CTR, and average position.
- Support breakdowns by query, page, country, device, search appearance, and date.
- Support search/filtering within returned table results.
- Preserve Google API semantics; the portal must not imply that rounded or aggregated results are exact raw event data.
- Provide pagination or progressive loading for large result sets.

### 5.6 Indexing and sitemaps

- List submitted sitemaps and the fields returned by the Search Console API.
- Display available counts, status, warnings, errors, and last submission/download dates.
- Link users to the applicable Search Console property when a report is not available through the API.
- Do not fabricate a complete Page Indexing report from unrelated metrics.

### 5.7 URL inspection

- Accept a fully qualified URL belonging to the selected property.
- Inspect the version currently known to Google's index.
- Display the high-level verdict, coverage state, robots state, indexing state, page fetch state, last crawl time, Google-selected canonical, user-declared canonical, crawl agent, known sitemaps, referring URLs, and rich-result details when returned.
- Explain that the API does not run a live URL test or request indexing.

### 5.8 Core Web Vitals

- Query CrUX by selected origin and optionally by a specific URL.
- Display LCP, INP, and CLS values and good/needs-improvement/poor distributions when returned.
- Clearly state that CrUX represents aggregated real-user field data over a rolling period.
- Display an explicit insufficient-data state instead of zero values.

### 5.9 Settings and status

- Show Google connection state without exposing tokens.
- Show the connected account identifier only when safely available.
- Allow cache refresh and Google reconnection.
- Show the last successful API synchronization time.

## 6. Quality requirements

- Desktop-first responsive layout that remains usable on tablets.
- Accessible form labels, keyboard navigation, and non-color-only status indicators.
- Clear loading, empty, partial-data, stale-data, and failure states.
- Server-side secret handling.
- Predictable API quota usage through caching and request validation.
- Tests for authentication, API adapters, transformations, validation, and critical UI flows.

## 7. Success criteria

Phase 1 is successful when an internal team member can sign in, connect the authorized Google account once, select any accessible property, review performance and Core Web Vitals, inspect an eligible URL, and understand API limitations without opening Search Console for routine checks.

