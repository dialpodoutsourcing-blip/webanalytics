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

## 5. OAuth requirements

- Authorization-code flow handled on the server.
- Random, expiring, one-use OAuth state.
- Read-only Search Console scope.
- Exact redirect URI allowlist.
- Refresh token encrypted at rest before deployment.
- Access/refresh tokens excluded from logs and API responses.
- Reauthorization path for revoked grants.

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
- Use persistent, access-controlled storage for SQLite.
- Restrict filesystem/database permissions to the application process.
- Confirm OAuth redirect URIs exactly match the deployed domain.
- Back up the small database securely.
- Configure log retention and secret redaction.
- Consider network-level access restrictions for an internal-only deployment.

## 8. Repository policy

No GitHub push is part of the current work. If a repository is created later, secrets, `.env`, SQLite database files, build output, and logs must remain ignored.

