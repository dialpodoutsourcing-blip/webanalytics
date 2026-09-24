# Shared Google Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist one encrypted owner Google refresh token in private Vercel Blob storage so every portal session can use the same Search Console properties without per-user Google authorization.

**Architecture:** Replace Prisma/SQLite usage in the Google OAuth path with a focused Blob-backed connection store and replace database OAuth state with a signed, short-lived, HTTP-only cookie. Keep Google access server-only and read-only; the dashboard automatically uses the shared connection while Settings owns the one-time connect/reconnect flow.

**Tech Stack:** Next.js 16.3.6 App Router, TypeScript, Vitest, `jose`, `googleapis`, `@vercel/blob` 2.8.0, Vercel private Blob storage

**Spec:** `docs/superpowers/specs/2026-09-24-shared-google-connection-design.md`

## Global Constraints

- One Google connection is shared by every authenticated portal session; there is no per-user Google identity.
- Store only a versioned encrypted refresh token and non-secret metadata in one private Blob object.
- Use the read-only Search Console scope `https://www.googleapis.com/auth/webmasters.readonly`.
- OAuth state expires after ten minutes, is signed with `SESSION_SECRET`, and is stored in an `HttpOnly`, `SameSite=Lax` cookie that is `Secure` in production.
- Never expose or log OAuth codes, access tokens, refresh tokens, encryption keys, Blob URLs, or Blob credentials.
- Follow Next.js 16 APIs: `cookies()` is asynchronous and cookie mutation occurs only in Route Handlers.
- Normal dashboard users must not be prompted to connect their own Google accounts.

## Review Focus

- Missing Blob connection object must produce a safe disconnected state and a recoverable Settings action.
- Malformed or unsupported Blob JSON must not reach token decryption or Google APIs.
- Missing, expired, mismatched, or replayed OAuth state must fail before code exchange and clear the state cookie.
- Google code exchange without a refresh token must preserve the previous shared connection and show reconnect guidance.
- Revoked or undecryptable refresh tokens must return a service-unavailable response without leaking provider details.

---

### Task 1: Versioned shared-connection record and private Blob adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `features/google/connection-record.ts`
- Create: `features/google/connection-store.ts`
- Create: `tests/google/connection-record.test.ts`
- Create: `tests/google/connection-store.test.ts`

**Interfaces:**
- Consumes: `encryptToken(token: string, key: string): string` and `decryptToken(payload: string, key: string): string` from `features/google/token-crypto.ts` in later tasks.
- Produces: `SharedGoogleConnection`, `parseConnectionRecord(value: unknown)`, and `ConnectionStore` with `read(): Promise<SharedGoogleConnection | null>` and `write(record: SharedGoogleConnection): Promise<void>`.
- Produces: `blobConnectionStore`, backed by private pathname `private/google/shared-connection.json`.

- [ ] **Step 1: Install the Blob SDK**

Run: `npm install @vercel/blob@2.8.0`

Expected: dependency and lockfile entries for `@vercel/blob` 2.8.0.

- [ ] **Step 2: Write failing record-validation tests**

Create tests that assert:

```ts
expect(parseConnectionRecord({ version: 1, refreshTokenEncrypted: "cipher", connectedAt: "2026-09-24T00:00:00.000Z", updatedAt: "2026-09-24T00:00:00.000Z" })).toEqual(expect.objectContaining({ version: 1 }));
expect(() => parseConnectionRecord({ version: 2 })).toThrow();
expect(() => parseConnectionRecord({ version: 1, refreshTokenEncrypted: "" })).toThrow();
expect(() => parseConnectionRecord(null)).toThrow();
```

- [ ] **Step 3: Run the record tests and verify RED**

Run: `npm test -- --run tests/google/connection-record.test.ts`

Expected: FAIL because `connection-record.ts` does not exist.

- [ ] **Step 4: Implement the versioned record schema**

Use Zod to define and export:

```ts
export type SharedGoogleConnection = {
  version: 1;
  refreshTokenEncrypted: string;
  accountEmail?: string;
  scope?: string;
  connectedAt: string;
  updatedAt: string;
};

export function parseConnectionRecord(value: unknown): SharedGoogleConnection;
```

Require ISO-compatible datetime strings and a non-empty encrypted token.

- [ ] **Step 5: Run record tests and verify GREEN**

Run: `npm test -- --run tests/google/connection-record.test.ts`

Expected: PASS.

- [ ] **Step 6: Write failing adapter contract tests**

Test a factory `createConnectionStore({ getObject, putObject })` with injected fakes. Assert `read()` returns `null` when `getObject` returns `null`, parses valid JSON, rejects malformed JSON, and `write()` sends the stable pathname, serialized record, and `{ access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 }`.

- [ ] **Step 7: Run adapter tests and verify RED**

Run: `npm test -- --run tests/google/connection-store.test.ts`

Expected: FAIL because the store factory is missing.

- [ ] **Step 8: Implement the adapter and Blob binding**

Implement the injectable factory and bind it to `@vercel/blob`:

```ts
const PATHNAME = "private/google/shared-connection.json";
const result = await get(PATHNAME, { access: "private", useCache: false });
const value = result ? await new Response(result.stream).json() : null;
await put(PATHNAME, JSON.stringify(record), {
  access: "private",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
  cacheControlMaxAge: 60,
});
```

- [ ] **Step 9: Run both focused tests and commit**

Run: `npm test -- --run tests/google/connection-record.test.ts tests/google/connection-store.test.ts`

Expected: PASS.

Commit:

```bash
git add package.json package-lock.json features/google/connection-record.ts features/google/connection-store.ts tests/google/connection-record.test.ts tests/google/connection-store.test.ts
git commit -m "feat: add shared Google Blob connection store"
```

### Task 2: Signed, expiring OAuth state cookie

**Files:**
- Create: `features/google/oauth-state.ts`
- Create: `tests/google/oauth-state.test.ts`

**Interfaces:**
- Consumes: `SESSION_SECRET` from `getEnv()` at the route boundary.
- Produces: `createOAuthState(secret: string, now?: Date): Promise<{ state: string; cookieValue: string }>`.
- Produces: `verifyOAuthState(cookieValue: string | undefined, queryState: string, secret: string, now?: Date): Promise<boolean>`.
- Cookie name exported as `GOOGLE_OAUTH_STATE_COOKIE`.

- [ ] **Step 1: Write failing state tests**

Assert that a generated state verifies with the same secret; wrong query state, wrong secret, missing cookie, malformed token, and a time eleven minutes later return `false`. Assert a state cannot be inferred from the signed cookie payload by using a random opaque state and JWT claims limited to its SHA-256 digest and expiry.

- [ ] **Step 2: Run the state tests and verify RED**

Run: `npm test -- --run tests/google/oauth-state.test.ts`

Expected: FAIL because `oauth-state.ts` does not exist.

- [ ] **Step 3: Implement state signing and verification**

Use `randomBytes(32).toString("base64url")`, SHA-256, and `jose` `SignJWT`/`jwtVerify` with an encoded `SESSION_SECRET`. Sign claims `{ stateHash }`, set issued-at and ten-minute expiry, verify the JWT, hash the query state, and compare equal-length digest buffers with `timingSafeEqual`.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- --run tests/google/oauth-state.test.ts`

Expected: PASS.

Commit:

```bash
git add features/google/oauth-state.ts tests/google/oauth-state.test.ts
git commit -m "feat: add stateless Google OAuth state"
```

### Task 3: Refactor Google OAuth to the shared Blob connection

**Files:**
- Modify: `features/google/oauth.ts`
- Create: `tests/google/oauth.test.ts`

**Interfaces:**
- Consumes: `ConnectionStore`, token encryption helpers, Google OAuth2 client configuration, and verified OAuth state from the routes.
- Produces: `createGoogleOAuthService(deps)` for deterministic tests.
- Produces: `beginGoogleOAuth(state: string): string`, `finishGoogleOAuth(code: string): Promise<void>`, `getAuthorizedGoogleClient(): Promise<OAuth2Client>`, and `getConnectionStatus(): Promise<{ connected: boolean; connectedAt: string | null; needsAttention: boolean }>`.

- [ ] **Step 1: Write failing service tests**

With injected OAuth-client and store fakes, assert:

```ts
expect(service.beginGoogleOAuth("opaque-state")).toContain("state=opaque-state");
await service.finishGoogleOAuth("code");
expect(saved.refreshTokenEncrypted).not.toContain("plain-refresh-token");
expect(await service.getConnectionStatus()).toEqual({ connected: true, connectedAt: expect.any(String), needsAttention: false });
```

Also assert that a code exchange without `refresh_token` rejects without calling `store.write`, a missing record throws `GOOGLE_NOT_CONNECTED`, malformed/decryption failure yields `needsAttention: true`, and a valid stored token is decrypted only before `setCredentials({ refresh_token })`.

- [ ] **Step 2: Run the OAuth service tests and verify RED**

Run: `npm test -- --run tests/google/oauth.test.ts`

Expected: FAIL because the existing module depends on Prisma and lacks the injectable service.

- [ ] **Step 3: Implement the shared OAuth service**

Remove all Prisma imports and database operations. Generate the authorization URL from the supplied state using `access_type: "offline"`, `prompt: "consent"`, and the read-only scope. On exchange, require `refresh_token`, encrypt it, preserve the first `connectedAt` on reconnect when a readable record exists, update `updatedAt`, and overwrite the Blob record. Build production exports from `blobConnectionStore`, `getEnv()`, and `google.auth.OAuth2`.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- --run tests/google/oauth.test.ts tests/google/token-crypto.test.ts`

Expected: PASS.

Commit:

```bash
git add features/google/oauth.ts tests/google/oauth.test.ts
git commit -m "feat: persist shared Google OAuth connection"
```

### Task 4: Secure OAuth routes and shared-connection UI

**Files:**
- Modify: `app/api/auth/google/start/route.ts`
- Modify: `app/api/auth/google/callback/route.ts`
- Modify: `app/api/properties/route.ts`
- Modify: `app/(dashboard)/settings/page.tsx`
- Modify: `components/dashboard-client.tsx`
- Create: `tests/google/oauth-routes.test.ts`
- Create: `tests/components/settings.test.tsx`
- Modify: `tests/components/overview-performance.test.ts`

**Interfaces:**
- Consumes: state helpers and OAuth service from Tasks 2 and 3.
- Produces: authenticated start route that sets the state cookie, callback route that always clears it, and Settings UI reflecting global connection status.

- [ ] **Step 1: Write failing route tests**

Test that the start route rejects unauthenticated access, sets the cookie with `httpOnly: true`, `sameSite: "lax"`, `maxAge: 600`, `path: "/api/auth/google/callback"`, and production `secure: true`; callback rejects invalid state before exchange; valid callback clears the cookie and redirects to `/settings?connected=1`; provider failure clears the cookie and redirects to `/settings?error=google_connection`.

- [ ] **Step 2: Run route tests and verify RED**

Run: `npm test -- --run tests/google/oauth-routes.test.ts`

Expected: FAIL because current routes neither set nor verify cookies.

- [ ] **Step 3: Implement the route flow with Next.js 16 cookies**

Use `const cookieStore = await cookies()`. Set the signed state cookie in the start handler. In the callback, read and immediately delete the cookie, verify state, exchange the code only after verification, and return safe Settings redirects for success and failure.

- [ ] **Step 4: Write failing UI tests**

Assert Settings renders **Connected owner Google account** and **Reconnect Google** when connected, renders **Connect owner Google account** when disconnected, and renders safe recovery copy for `error=google_connection`. Assert the property-picker error contains no **Connect Google** link and instead says the shared Google connection needs attention.

- [ ] **Step 5: Run UI tests and verify RED**

Run: `npm test -- --run tests/components/settings.test.tsx tests/components/overview-performance.test.ts`

Expected: FAIL against the current static Settings page and connection link.

- [ ] **Step 6: Implement Settings and dashboard copy**

Make Settings an async Server Component that awaits `getConnectionStatus()`. Show the global status and connect/reconnect action. Replace `LinkConnect` with non-link recovery guidance. Change `/api/properties` failure text to `The shared Google connection is unavailable. Ask the portal owner to reconnect it in Settings.`

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- --run tests/google/oauth-routes.test.ts tests/components/settings.test.tsx tests/components/overview-performance.test.ts`

Expected: PASS.

Commit:

```bash
git add app/api/auth/google/start/route.ts app/api/auth/google/callback/route.ts app/api/properties/route.ts "app/(dashboard)/settings/page.tsx" components/dashboard-client.tsx tests/google/oauth-routes.test.ts tests/components/settings.test.tsx tests/components/overview-performance.test.ts
git commit -m "feat: use one shared Google connection"
```

### Task 5: Configuration, deployment, and end-to-end verification

**Files:**
- Modify: `.env.example`
- Modify: `docs/SECURITY_AND_ENV.md`

**Interfaces:**
- Consumes: all completed application behavior.
- Produces: a connected private Blob store, production deployment, and documented owner-only setup/reconnect procedure.

- [ ] **Step 1: Update configuration documentation**

Document `BLOB_READ_WRITE_TOKEN`/Vercel OIDC-managed Blob credentials, one shared owner account, Testing-mode test-user restriction, exact production redirect URI, and the fact that `DATABASE_URL` is not used by the OAuth connection path. Do not place real credentials in tracked files.

- [ ] **Step 2: Run the full local verification suite**

Run:

```bash
npm test -- --run
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0 with every test passing.

- [ ] **Step 3: Commit documentation**

```bash
git add .env.example docs/SECURITY_AND_ENV.md
git commit -m "docs: document shared Google connection setup"
```

- [ ] **Step 4: Provision and connect a private Blob store**

Inspect first:

```bash
vercel storage list
vercel storage status
```

If no suitable private store is connected, run:

```bash
vercel storage create webanalytics-google-connection --type blob --access private
vercel storage connect webanalytics-google-connection --yes
vercel storage status webanalytics-google-connection
```

Expected: the `webanalytics` project has a private Blob connection for Production and Preview with server-side credentials configured.

- [ ] **Step 5: Push and deploy from Git**

Run:

```bash
git push origin main
```

Wait for the Git-sourced production deployment and verify it is `Ready`. Do not use a local CLI source upload because local `.env` must never enter a deployment bundle.

- [ ] **Step 6: Complete one-time owner authorization**

Log into the portal, open Settings, select **Connect owner Google account**, and authorize using the sole Google OAuth test user that owns the desired Search Console properties.

Expected: callback redirects to `/settings?connected=1`, Settings reports connected, and the private Blob store contains exactly the shared connection object without exposing its contents.

- [ ] **Step 7: Verify cross-session behavior**

In a separate private browser session, log into the portal without signing into Google. Request `/api/properties` through the UI.

Expected: the property picker loads the owner's Search Console properties, no Google consent appears, and production logs contain no SQLite error, token material, or unhandled 500.

- [ ] **Step 8: Final repository and deployment check**

Run:

```bash
git status --short --branch
vercel inspect https://webanalytics-ten.vercel.app
vercel logs --project webanalytics --environment production --since 30m --level error
```

Expected: clean worktree, local `main` synchronized with `origin/main`, production deployment Ready, and no errors from the verified flow.

