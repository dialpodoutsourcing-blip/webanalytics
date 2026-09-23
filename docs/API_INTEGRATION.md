# API Integration

## 1. Scope

Phase 1 uses two official Google APIs:

- Google Search Console API for properties, Search Analytics, sitemaps, and URL inspection.
- Chrome UX Report API for Core Web Vitals field data.

Google Analytics 4 and Google Business Profile are not phase 1 integrations.

## 2. Google Cloud prerequisites

The owner will need a Google Cloud project associated with the intended Google account or organization.

1. Enable the Google Search Console API.
2. Enable the Chrome UX Report API.
3. Configure the OAuth consent screen.
4. Create a Web application OAuth client.
5. Add the local and deployed OAuth callback URLs.
6. Place the client ID, client secret, callback URL, and CrUX API key in server environment variables.

The implementation guide will provide exact UI instructions and callback values after the local application port and deployment domain are finalized.

## 3. OAuth behavior

- Use authorization-code OAuth on the server.
- Request offline access so Google can return a refresh token.
- Use a read-only Search Console scope.
- Generate and validate a short-lived OAuth `state` value.
- Store refresh tokens only in the database and never return them to the browser.
- Treat a missing refresh token on reconnection carefully; Google may not issue a new one unless consent is renewed.
- Allow the owner to disconnect the stored authorization.

## 4. Search Console operations

### Sites

Use the Sites service to list properties accessible to the connected account. Phase 1 is read-only and will not add or remove Search Console properties.

### Search Analytics

Query performance by date range and supported dimensions. Planned dimensions include date, query, page, country, device, and search appearance. The portal supports clicks, impressions, CTR, and average position.

Important constraints:

- Search Console data is aggregated and may be delayed.
- Some low-volume/anonymized data may not appear.
- Rows are not guaranteed to represent every possible result.
- API row limits and quotas require pagination, caching, and restrained queries.
- Filter and aggregation combinations must follow Google's API rules.

### Sitemaps

List sitemaps and display the status/count fields returned by Google. Phase 1 does not submit or delete sitemaps because the portal uses read-only access.

### URL inspection

Inspect a URL under the selected property and display the indexed-version result. The operation does not provide a live test and cannot request indexing.

The server validates that the submitted URL belongs to the selected URL-prefix or domain property before calling Google.

## 5. Core Web Vitals via CrUX

CrUX is queried by origin on the overview and optionally by exact URL on the Core Web Vitals page. The primary metrics are:

- Largest Contentful Paint (LCP)
- Interaction to Next Paint (INP)
- Cumulative Layout Shift (CLS)

CrUX contains aggregated real-user data and may not contain a record for low-traffic origins or URLs. Missing data must render as **Insufficient field data**, not as passing, failing, or zero.

## 6. API capability boundaries

The portal will not claim parity with the Search Console web interface. In particular:

- A full Page Indexing/Coverage dashboard is not exposed as a general Search Console API report.
- URL Inspection reports only the version in Google's index through the API; it does not run the web interface's live test.
- Request indexing is not included.
- Search Console's grouped Core Web Vitals issue report is not directly reproduced; CrUX supplies origin/URL field metrics instead.
- Search Console UI totals and portal tables may differ because of aggregation, anonymization, filters, freshness, and row limits.

Where practical, the UI will link to the appropriate Search Console page for unsupported workflows.

## 7. Quota and reliability controls

- Cache normalized responses.
- Validate requests before using quota.
- Coalesce identical in-flight requests where practical.
- Limit arbitrary date ranges and table page sizes.
- Use targeted retry with backoff only for transient failures.
- Do not retry permission, validation, or quota errors in a tight loop.
- Record the last successful fetch time per report.

## 8. Future GBP geo grid

The first geo-grid milestone will use sample or imported data to validate the map interface and ranking visualization. Live local-rank scanning requires a separate, legally and technically appropriate ranking-data provider; it is not assumed to be available from the Search Console API.

