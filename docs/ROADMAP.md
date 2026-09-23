# Roadmap

## Phase 0: Documentation

- Approve product scope and architecture.
- Create the product and technical Markdown documents.
- Review and revise the consolidated design record.
- Create a detailed implementation plan only after written-spec approval.

## Phase 1: Search Console portal foundation

- Scaffold Next.js, TypeScript, Tailwind, Prisma, and SQLite.
- Add environment validation.
- Implement the shared portal login and protected application shell.
- Implement one-time Google OAuth and encrypted token persistence.
- List accessible Search Console properties.

## Phase 1A: Performance reporting

- Add overview metric cards and trend chart.
- Add performance date presets and filters.
- Add query, page, country, device, search appearance, and date tables.
- Add normalized caching, freshness labels, and manual refresh.

## Phase 1B: Technical search data

- Add sitemap reporting.
- Add URL inspection with property validation.
- Add links/fallback messaging for indexing reports unavailable through the API.

## Phase 1C: Core Web Vitals

- Integrate the CrUX API.
- Add origin- and URL-level LCP, INP, and CLS views.
- Add insufficient-data handling and clear field-data explanations.

## Phase 1D: Hardening

- Complete automated tests.
- Add login throttling, security headers, secret redaction, and production cookie settings.
- Exercise quota and upstream-failure behavior.
- Review accessibility and responsive layouts.
- Produce deployment documentation when a host is selected.

## Phase 2: GBP geo-grid prototype

- Define a provider-neutral geo-grid data shape.
- Build the map and ranked marker interface using sample data.
- Add keyword, center point, radius, and grid-size controls.
- Support CSV or JSON import if useful.
- Validate usefulness with the internal team before purchasing or integrating live rank data.

## Phase 3: Live local-rank data

- Evaluate free tiers and paid local-search data providers for legality, reliability, quota, geography, and cost.
- Select a provider only after testing.
- Add scheduled scans, historical comparisons, and quota controls.

## Possible later enhancements

- Google Analytics 4 integration.
- Multiple Google connections.
- Individual staff accounts and roles.
- Client-specific access.
- Exports and scheduled reports.
- Alerts for material performance or Core Web Vitals changes.

These enhancements are not implied commitments and require separate design approval.

