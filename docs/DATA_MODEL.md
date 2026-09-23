# Data Model

## 1. Principles

- Store only what the portal needs.
- Keep Google secrets server-side.
- Cache normalized report results rather than binding the UI to raw Google payloads.
- Make cached data disposable; authoritative data remains with Google.
- Support one portal installation and one connected Google authorization in phase 1.

## 2. Planned entities

### GoogleConnection

Represents the single connected Google authorization.

| Field | Purpose |
|---|---|
| `id` | Stable internal identifier |
| `accountEmail` | Display-only connected account email when available |
| `accessTokenEncrypted` | Optional short-lived token storage if required by the client strategy |
| `refreshTokenEncrypted` | Encrypted OAuth refresh token |
| `scope` | Granted OAuth scopes |
| `tokenExpiresAt` | Access-token expiration time |
| `connectedAt` | Initial connection time |
| `updatedAt` | Last token/metadata update |

Only one active record is supported in phase 1. Token encryption is required before any non-local deployment.

### AppSetting

Stores non-secret application preferences.

| Field | Purpose |
|---|---|
| `key` | Unique setting key |
| `value` | Serialized setting value |
| `updatedAt` | Last update time |

The initial use is `selectedProperty`.

### CachedReport

Stores normalized API results.

| Field | Purpose |
|---|---|
| `id` | Stable identifier |
| `cacheKey` | Unique hash of report type and validated inputs |
| `reportType` | Performance, properties, sitemaps, inspection, or CrUX |
| `propertyId` | Search Console property when applicable |
| `parametersJson` | Normalized non-secret query parameters |
| `payloadJson` | Normalized report response |
| `fetchedAt` | Time received from the upstream API |
| `expiresAt` | Cache expiration time |
| `createdAt` | Record creation time |
| `updatedAt` | Record update time |

Expired cache entries can be deleted by periodic maintenance or opportunistically during writes.

### OAuthState

Stores short-lived, one-use state for the OAuth callback when session-only storage is insufficient.

| Field | Purpose |
|---|---|
| `stateHash` | Hash of the generated state value |
| `expiresAt` | Expiration time |
| `createdAt` | Creation time |

The record is deleted after successful validation or expiry.

## 3. Deliberately omitted entities

- Users and roles: the portal has one shared environment-backed login.
- Search Console properties: retrieved from Google and cached as a report.
- Analytics events: the app is a reporting client, not an event collector.
- GBP rankings: deferred until the geo-grid phase.

## 4. Retention

- OAuth state: minutes.
- Access tokens: only as long as required by the library strategy.
- Refresh token: until disconnect/revocation.
- Cached reports: expired data may be retained briefly for stale fallback, then removed.
- Logs: limited operational retention and no secrets or full tokens.

