# UI Specification

## 1. Experience goals

The interface should feel familiar to users of Google Search Console without copying Google's product exactly. It should prioritize fast property switching, legible metrics, direct filtering, and honest data-state messaging.

## 2. Application shell

### Sidebar

- Product name/logo area.
- Overview.
- Performance.
- Indexing & Sitemaps.
- URL Inspection.
- Core Web Vitals.
- Settings.
- Future GBP Geo Grid item shown only when that phase is enabled.

### Header

- Search Console property selector.
- Current date range where applicable.
- Data freshness indicator.
- Manual refresh action.
- Logout menu.

The sidebar may collapse on smaller screens. The primary phase 1 target is desktop and tablet use.

## 3. Login

- Username and password inputs.
- Submit button with pending state.
- Generic invalid-credentials message.
- No registration or password-reset links.
- Development credentials must never be printed on the screen.

## 4. First-run Google connection

- Explain that Search Console has not been connected.
- Primary **Connect Google** button.
- Brief list of read-only data requested.
- Clear callback success and failure states.

## 5. Overview

- Four metric cards: clicks, impressions, average CTR, and average position.
- Performance trend chart.
- Top queries table.
- Top pages table.
- Sitemap/indexing summary card using available API data.
- Core Web Vitals card for LCP, INP, and CLS.
- Empty states for new properties or insufficient data.

## 6. Performance

- Date presets: 7 days, 28 days, and 3 months.
- Optional custom date range constrained to API-supported values.
- Search type and supported filters.
- Toggleable metric series in the chart.
- Tabs for queries, pages, countries, devices, search appearance, and dates.
- Sortable table columns for clicks, impressions, CTR, and position.
- Pagination/progressive loading and CSV export may be added after the core report works; CSV export is not required for the first implementation milestone.

## 7. Indexing & Sitemaps

- Explanatory banner stating that Google's public API does not provide the complete Page Indexing report.
- Sitemap list with type, status, last submitted/downloaded, warnings, errors, and returned content counts where available.
- Link to open the selected property in Search Console for unsupported indexing detail.

## 8. URL Inspection

- URL input pre-associated with the selected property.
- Inspect action with pending state.
- Validation message for a URL outside the selected property.
- Summary verdict followed by crawl/index, canonical, sitemap, referring URL, and rich-result sections.
- Link to Google's inspection result when returned.
- Notice that the result is Google's indexed version, not a live test.

## 9. Core Web Vitals

- Origin/URL mode selector.
- LCP, INP, and CLS status cards.
- P75 value and distribution visualization when available.
- Definitions and thresholds presented in plain language.
- Strong insufficient-data state with no misleading score.
- Statement that the field data represents a rolling aggregation period.

## 10. Settings

- Google account connection status.
- Connect, reconnect, or disconnect action.
- Selected property summary.
- Cache status and targeted clear/refresh action.
- Environment readiness indicators that reveal presence, not secret values.

## 11. Reusable display states

Every data panel supports:

- Loading skeleton.
- Successful result.
- No data.
- Insufficient data.
- Stale cached result.
- Authorization required.
- Quota exceeded.
- Temporary upstream failure.

Statuses use an icon and text in addition to color.

## 12. Future GBP geo grid

The later sample-data screen will include a map, evenly spaced rank markers, keyword/location controls, average map rank, rank change, and a legend. Green, amber, and red markers must also show numeric ranks so color is not the only signal.

