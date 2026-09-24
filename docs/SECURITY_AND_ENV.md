# Security and Environment

## 1. Security posture

This is an internal portal with lightweight shared authentication. It is appropriate for a small trusted team only when deployed behind HTTPS with strong credentials. It is not a full identity or authorization system.

## 2. Portal credentials

The requested local defaults are:

```dotenv
PORTAL_USERNAME=admin
PORTAL_PASSWORD=admin
```

These values belong only in a local `.env` file. They must be replaced with a unique username and a long password before the application is accessible beyond the local machine.

The server compares credentials without logging them. Rate limiting and a short delay after repeated failures should protect the login endpoint.

## 3. Planned environment variables

```dotenv
# Portal login
PORTAL_USERNAME=admin
PORTAL_PASSWORD=admin
SESSION_SECRET=replace-with-a-long-random-value

# Application
APP_URL=http://localhost:3000
DATABASE_URL=file:./dev.db

# Google OAuth
GOOGLE_CLIENT_ID=replace-me
GOOGLE_CLIENT_SECRET=replace-me
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Chrome UX Report
GOOGLE_CRUX_API_KEY=replace-me

# Token protection
TOKEN_ENCRYPTION_KEY=replace-with-a-valid-random-key

# Private shared Google connection storage
BLOB_READ_WRITE_TOKEN=managed-by-vercel-private-blob-store
```

The final `.env.example` will use placeholders and contain no working secret. `.env` and local database files will be excluded from version control.

## 4. Session requirements

- Signed session with a strong environment-provided secret.
- HTTP-only cookie.
- `Secure` cookie in production.
- `SameSite=Lax` or stricter where compatible with OAuth.
- Reasonable idle/absolute expiration.
- Session invalidation on logout.
- No portal credential stored in browser storage.

## 5. Shared Google OAuth requirements

- Authorization-code flow handled on the server.
- One owner Google account authorizes the portal once; every portal session uses that shared Search Console access.
- While the Google OAuth app is in Testing mode, only the owner account should be configured as a test user.
- Production JavaScript origin: `https://webanalytics-ten.vercel.app`.
- Production redirect URI: `https://webanalytics-ten.vercel.app/api/auth/google/callback`.
- Random, signed, expiring OAuth state stored in an HTTP-only cookie and cleared by the callback.
- Read-only Search Console scope.
- Exact redirect URI allowlist.
- Refresh token encrypted before it is written to one private Vercel Blob object.
- Access/refresh tokens excluded from logs and API responses.
- Settings is the only connect/reconnect path; normal report pages never ask users to connect their own Google account.
- Reauthorization path for revoked grants or an unreadable shared connection.

The Blob integration supplies `BLOB_READ_WRITE_TOKEN` or OIDC-managed Blob credentials to server code. Do not copy these credentials into tracked files or expose the Blob URL to the browser. `DATABASE_URL` remains available for legacy Prisma models, but the production Google OAuth and Search Console connection path does not read or write SQLite.

## 6. Input and response safety

- Validate date ranges, filters, pagination, property identifiers, and URLs on the server.
- Enforce that inspected URLs belong to the selected property.
- Use parameterized database access through Prisma.
- Escape/render upstream strings as text.
- Do not expose stack traces or raw Google errors to the browser.
- Add appropriate security headers.

## 7. Deployment checklist

- Replace both `admin` development credentials.
- Use HTTPS.
- Generate new session and token-encryption secrets.
- Connect a private Vercel Blob store to Production and Preview.
- Authorize the owner Google account once and confirm Settings reports the shared connection.
- Confirm a separate private browser session loads the owner account's Search Console properties without Google consent.
- Restrict filesystem/database permissions to the application process.
- Confirm OAuth redirect URIs exactly match the deployed domain.
- Back up the small database securely.
- Configure log retention and secret redaction.
- Consider network-level access restrictions for an internal-only deployment.

## 8. Repository policy

No GitHub push is part of the current work. If a repository is created later, secrets, `.env`, SQLite database files, build output, and logs must remain ignored.

