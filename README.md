# Web Analytics Portal

An internal web portal for viewing Google Search Console performance, indexing signals, URL inspection results, and Core Web Vitals across the websites available to one connected Google account.

## Project status

This repository currently contains the approved product and technical documentation only. Application implementation will begin after the documentation is reviewed.

## Phase 1 scope

- One shared internal portal login.
- One-time Google OAuth connection.
- Search Console property selection.
- Search performance charts and tables.
- Sitemap and available indexing information.
- URL inspection for individual URLs.
- Core Web Vitals from the Chrome UX Report API.
- API response caching and manual refresh.

The Google Business Profile geo-grid feature is deferred to a later phase. Its first version will use sample or imported data rather than live rank scanning.

## Planned stack

- Next.js with the App Router and TypeScript
- Node.js server routes
- Tailwind CSS
- SQLite and Prisma
- Google Search Console API
- Chrome UX Report API

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API integration](docs/API_INTEGRATION.md)
- [Data model](docs/DATA_MODEL.md)
- [UI specification](docs/UI_SPEC.md)
- [Security and environment](docs/SECURITY_AND_ENV.md)
- [Roadmap](docs/ROADMAP.md)
- [Approved design record](docs/superpowers/specs/2026-09-23-web-analytics-portal-design.md)

## Important terminology

The first reference screenshot is Google Search Console, not Google Analytics (GA4). Phase 1 integrates Search Console. GA4 is outside the approved phase 1 scope and may be added later.

