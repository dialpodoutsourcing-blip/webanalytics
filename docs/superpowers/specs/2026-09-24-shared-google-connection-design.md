# Shared Google Connection via Vercel Blob

## Purpose

The portal must use one Google Search Console account for every authenticated portal session. The owner authorizes Google once. After that, users on any computer see the Search Console properties available to that owner account without connecting their own Google accounts.

## Current Problem

The existing OAuth flow stores the authorization state and Google tokens in a local SQLite database. Vercel Functions cannot open the configured SQLite database file, so `/api/auth/google/start` fails with `PrismaClientInitializationError` before reaching Google.

## Architecture

Use one private Vercel Blob object as the durable shared connection record. The object contains an encrypted refresh token and non-secret connection metadata. It is read and written only by server-side code.

The short-lived OAuth state does not need persistent storage. Store a cryptographically random state value in a signed, HTTP-only cookie with a ten-minute lifetime. The callback verifies the query state against the signed cookie and clears the cookie before exchanging the authorization code.

The application continues to use the configured Google OAuth client ID, client secret, redirect URI, and read-only Search Console scope. It requests offline access and explicit consent so Google returns a refresh token.

## Shared Connection Flow

1. An authenticated portal user opens Settings and selects **Connect owner Google account** when no shared connection exists, or **Reconnect Google** when replacing it.
2. `/api/auth/google/start` generates the OAuth state cookie and redirects to Google's consent screen.
3. Google redirects to `/api/auth/google/callback`.
4. The callback verifies and clears the state cookie, exchanges the code, requires a refresh token, encrypts it with `TOKEN_ENCRYPTION_KEY`, and overwrites the single private Blob connection object.
5. Settings reports the shared account as connected.
6. Every Search Console API request loads and decrypts that same refresh token and creates an authorized Google client.

No connection or token is associated with a portal browser, computer, or individual portal session.

## Blob Storage

- Use a private Vercel Blob store and its server-side token.
- Use a stable pathname for one connection object.
- Store a versioned JSON payload containing the encrypted refresh token, optional account email, granted scope, and connection/update timestamps.
- Overwrite the object atomically on reconnection.
- Never return the Blob URL, Blob token, encrypted refresh token, or decrypted refresh token to client code.
- Treat a missing object as a disconnected state.
- Treat malformed data, decryption failure, revoked access, or a missing refresh token as a recoverable connection error that directs the owner to reconnect.

## User Interface

- Remove **Connect Google** links from normal dashboard error messages.
- Property loading happens automatically after portal login.
- Settings shows one of: **Connected**, **Not connected**, or **Connection needs attention**.
- When connected, Settings explains that all portal users share the owner's Search Console access and provides a deliberate **Reconnect Google** action.
- When disconnected, Settings provides the one-time owner connection action.
- OAuth callback failures redirect to Settings with a safe error indicator instead of exposing provider or token details.

## Security

- Keep portal authentication required for the OAuth start route and Settings.
- Sign OAuth state with `SESSION_SECRET`; use `HttpOnly`, `Secure` in production, `SameSite=Lax`, a narrow path, and a ten-minute maximum age.
- Compare state values using a timing-safe comparison.
- Encrypt the refresh token before Blob storage using the existing token-encryption facility.
- Keep Google access read-only.
- Do not log OAuth codes, access tokens, refresh tokens, encryption keys, or Blob credentials.
- Only the owner's Google account is expected to be an OAuth test user while the Google app remains in Testing mode.

## Configuration

Required production variables remain:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY`
- `SESSION_SECRET`

The private Vercel Blob integration adds its server-side store token. SQLite is no longer required for the Google connection path. Existing unused Prisma files may remain temporarily, but production OAuth and Search Console requests must not depend on them.

## Error Handling

- Reject missing, expired, malformed, mismatched, or replayed OAuth state.
- Reject a successful code exchange that does not provide a refresh token; instruct the owner to reconnect with consent.
- Return a service-unavailable response from Search Console routes when the shared connection is absent or unusable.
- Keep detailed causes in server logs without secrets; show concise recovery guidance in the UI.

## Testing

- Unit-test signed OAuth state creation, verification, expiry, mismatch, and one-time clearing behavior.
- Unit-test serialization and validation of the versioned shared connection record.
- Test that refresh tokens are encrypted before storage and decrypted only when constructing the Google client.
- Test disconnected, connected, malformed-record, and missing-refresh-token behavior.
- Test that normal property errors no longer direct every portal user to connect their own Google account.
- Run the full unit suite, lint, typecheck, and production build.
- After deployment, authorize the owner Google account once and verify property loading from a separate private browser session.

## Success Criteria

- Google authorization no longer touches SQLite or fails with database error 14.
- The owner completes Google consent once.
- The encrypted refresh token persists across deployments in private Vercel Blob storage.
- A different computer can log into the portal and load the owner's Search Console properties without Google consent.
- Normal users are never prompted to connect their own Google accounts.

