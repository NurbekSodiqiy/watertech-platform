# Security — the auth model

Who can reach this app, what decides that, and which of those decisions live in the Supabase dashboard
rather than in this repository.

Scope: authentication and authorization. Content integrity (the publish gate, the append-only version
history, `updated_by`) is in [MIGRATIONS.md](MIGRATIONS.md); the verification script is in
[TESTING.md](TESTING.md).

## 1. The model in one paragraph

There are exactly two ways to hold data from this project: a session belonging to an **active row in
`public.allowed_users`**, or the **service-role key**, which lives only on the server. Google decides
*who you are*; `allowed_users` decides *whether a token is issued at all*; `middleware.ts` decides
*which routes* that token opens; RLS decides *which rows*. No layer trusts a client-supplied identity —
not an email in a request body, not a role in a payload.

## 2. Sign-in, end to end

| # | Step | Where | What it decides |
| --- | --- | --- | --- |
| 1 | `signInWithOAuth({ provider: "google", redirectTo: "<origin>/auth/callback?locale=…" })` | [GoogleSignInButton.tsx](../app/[locale]/login/GoogleSignInButton.tsx) | Starts the PKCE flow. Top-level `window.location` redirect, so the CSP's `frame-ancestors 'none'` / `form-action 'self'` do not block it. |
| 2 | Google authenticates the person | accounts.google.com | Identity only. Any Google account can get this far. |
| 3 | Google → `https://<ref>.supabase.co/auth/v1/callback` → back to `<origin>/auth/callback?code=…&locale=…` | Supabase Auth | The `code` is single-use and bound to the PKCE verifier in the browser. |
| 4 | `exchangeCodeForSession(code)` | [app/auth/callback/route.ts](../app/auth/callback/route.ts) | **The gate.** GoTrue mints the access token here, and minting runs the hook in step 5. |
| 5 | `public.custom_access_token_hook(event)` | [0014_role_gated_rls.sql](../supabase/migrations/0014_role_gated_rls.sql) | Active `allowed_users` row → stamps `app_metadata.role` = `operator` \| `manager`. Otherwise returns the Auth Hooks error response and **no token exists**. |
| 6 | Route gating | [middleware.ts](../middleware.ts) | Reads the role off the locally verified JWT. Operators are confined to operator routes, managers to `/dashboard` and `/admin`, each direction enforced by the same check. Network-free (CLAUDE.md §4). |
| 7 | Row gating | RLS, via `private.is_member()` / `private.is_manager()` | Which rows that session sees, per table. |

`/login` and `/offline` are the only public paths. `/offline` is public because the service worker
precaches it without necessarily sending the session cookie; it holds no user data.

### Why step 5 is the gate, not step 4

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is in the browser bundle — that is what it is for, and it cannot be
kept secret. So anyone can drive steps 1–4 against the Auth API directly, without ever loading this
app.

Before migration 0014 the hook stamped `role = 'none'` for an unknown email and the callback route
called `signOut()` afterwards. That was too late: the JWT had already been signed, and a client that
kept it could present it to PostgREST, where every content read policy checked only
`status = 'published'`. Since 0014 the hook returns

```json
{ "error": { "http_code": 403, "message": "not_allowed" } }
```

which GoTrue propagates verbatim as an HTTP 403 without issuing a token. Postgres hook errors are not
retried. The callback route logs that refusal on its own line (status and code only — never the
account) and shows the same `/login?error=not_allowed` page as every other failure, so the browser
learns nothing about *why*.

### What the role claim means to the database

`private.app_role()`, `private.is_member()` and `private.is_manager()` (schema `private`, not exposed
by PostgREST, `USAGE` granted to `authenticated` alone) are the only readers of the claim. Because
step 5 refuses everyone else, `is_member()` is a sufficient membership test — the database does not
re-read `allowed_users` per request, and does not need to.

Per table, since 0014:

| Table(s) | `operator` | `manager` | anyone else |
| --- | --- | --- | --- |
| the 10 `content_*` tables | published rows | every row, plus insert/update/delete | nothing |
| `user_state` | own rows, read + write | every row, read only | nothing, and no insert |
| `content_versions`, `copilot_logs`, `admin_notifications`, `content_gate_reports`, `telemetry_events`, `allowed_users` | nothing | read (plus the `read_at` flip on `admin_notifications`) | nothing |
| `rate_limits` | nothing | nothing | nothing — `service_role` only, through `rate_limit_hit()` |

No policy anywhere targets `anon`, and `anon` holds no grant on any table. Writes that need to bypass
RLS (telemetry ingestion, the copilot log, the publish gate, the content loaders) go through
[lib/supabase/admin.ts](../lib/supabase/admin.ts) in server code only, and take the email from the
verified session, never from the payload.

## 3. Dashboard checklist — the owner's manual steps

None of this is in the repository, and the migration cannot do it. **Step 1 is what makes the P0 fix
take effect: without it the hook never runs and no role is ever stamped.**

- [ ] **1. Enable the hook.** Authentication → Hooks → *Customize Access Token (JWT) Claims* → enable,
      type *Postgres*, schema `public`, function `custom_access_token_hook`. The migration has already
      granted `EXECUTE` to `supabase_auth_admin` and left the `allowed_users` read policy for it in
      place. Verify by signing in and decoding the access token: `app_metadata.role` must be present.
      *Fail mode to know about:* if the hook is enabled but the function is broken, nobody can sign in.
      The Supabase dashboard is a separate login and stays reachable, so disabling the hook there is
      always the way out.
- [ ] **2. Decide "Allow new users to sign up."** Authentication → Sign In / Providers.
      **On** (Supabase default): an unknown Google account still creates an `auth.users` row — the hook
      runs at token issuance, after the user record is matched or created — and then gets the 403. It
      never holds a session or a role, and no policy grants it anything, but expect rejected accounts
      to accumulate under Authentication → Users. **Off:** an unknown account is refused earlier, by
      GoTrue itself, and nothing is created; the cost is that adding a colleague then takes two steps —
      an `allowed_users` row *and* an invite from the dashboard, because their first sign-in is a
      sign-up. For ~30 known users, **off** is the tighter setting and the recommended one; pick **on**
      only if you would rather self-serve new operators than invite them.
- [ ] **3. Google provider settings.** Authentication → Sign In / Providers → Google: enabled, with the
      Client ID and Client Secret from the Google Cloud project. On the Google side, the authorized
      redirect URI is Supabase's, not this app's: `https://<project-ref>.supabase.co/auth/v1/callback`.
      Leave "Skip nonce check" **off**. Restrict the OAuth consent screen to the company's Workspace
      domain if there is one — a second, independent filter in front of the allow-list.
- [ ] **4. Redirect URL allow-list.** Authentication → URL Configuration. Site URL = the production
      origin. Redirect URLs must cover every origin the app is served from, because
      `GoogleSignInButton` sends `window.location.origin + "/auth/callback"`: the production
      `https://<host>/auth/callback`, `http://localhost:3000/auth/callback` for local work, and a
      pattern for Vercel previews if those are used. Keep the patterns as narrow as the deployment
      allows — this list is what stops an attacker-chosen origin from receiving the `code`. (The
      callback route's own redirects are `origin` + a fixed path, and the only caller-supplied input,
      `?locale`, is accepted only if it matches `routing.locales`, so there is no open redirect on our
      side either.)
- [ ] **5. JWT expiry and signing keys.** Authentication → Sessions / JWT settings. The access-token
      TTL is the residual-risk window in §4 — 3600s is the default; 900s–1800s is a reasonable trade
      for this app, since a refresh is a background call and re-runs the hook. Also switch the project
      to **asymmetric (ECC) signing keys** if it is still on the legacy shared secret: `getClaims()`
      then verifies the JWT locally in middleware instead of calling the Auth API on every request.
      `middleware.ts` logs a one-time development warning while the project is still on HS256.
- [ ] **6. Confirm the allow-list.** `select email, role, is_active from public.allowed_users;` — every
      row is a person who should have access today, and exactly the right people have
      `role = 'manager'`. This table is the whole authorization model; `authenticated` has `SELECT` on
      it and nothing else (0013 revokes insert/update/delete), so it is edited in the dashboard or by
      `service_role`.

After 1–6: run [supabase/tests/rls-checks.sql](../supabase/tests/rls-checks.sql) on **staging**. Its
first block calls the hook directly and asserts the refusals; its non-member block asserts that a
`role = 'none'` token, a token with no `app_metadata`, and a deactivated user see zero rows in every
table — published content included.

## 4. Residual risk: the access-token window

**An access token is believed on its signature alone.** Nothing re-reads `allowed_users` while it is
valid. So removing or deactivating somebody takes effect like this:

| Action | Takes effect |
| --- | --- |
| `is_active = false`, or deleting the `allowed_users` row | Their **next token issuance** — which includes every refresh — is refused. Their current access token keeps working until it expires. |
| Changing `role` (operator ↔ manager) | Same: the old role stays in force for the rest of the current token's life, in middleware *and* in RLS. |
| Revoking sessions (Authentication → Users → the user → sign out / revoke) | Kills the refresh token, so no new access token can be minted. Does **not** invalidate the access token already in their browser. |

**The window is the remaining TTL of the access token they are holding — at most the JWT expiry set in
step 5, one hour by default.** Shortening that setting shortens the window proportionally; it is the
only lever short of rotating the project's JWT signing key, which invalidates every session at once and
is the break-glass option for a real compromise.

For this project's threat model — ~30 internal users, an internal sales knowledge base, no financial
transactions — an hour of stale access after a deactivation is acceptable. It is **not** acceptable for
a compromised account: there, revoke the session *and* rotate the signing key.

Two smaller residual notes:

- **A rejected account may exist in `auth.users`** (see checklist step 2) with no session and no role.
  Harmless, but the Users list is not the allow-list — `public.allowed_users` is.
- **Tokens minted before 0014** carry `role: "none"`. They are refused by `roleFromClaims()` in
  middleware and by `is_member()` in every policy, and they cannot be refreshed. They expire on their
  own within one TTL.

## 5. Adding, removing and promoting people

```sql
-- add (lowercase email — allowed_users_email_lowercase_chk)
insert into public.allowed_users (email, role, full_name)
values ('someone@company.uz', 'operator', 'Someone');

-- suspend, keeping the row and its history
update public.allowed_users set is_active = false where email = 'someone@company.uz';

-- promote / demote
update public.allowed_users set role = 'manager' where email = 'someone@company.uz';
```

Then, for a suspension that has to be immediate, revoke their sessions in Authentication → Users and
read §4 for what that does and does not do. Deleting the row works too; `is_active = false` is
preferred because `telemetry_events` and `copilot_logs` still reference the email, and the dashboard's
operator filter reads this table.

## 6. When you change any of this

- Policies, grants and hook changes are a **new numbered migration** — never an edit to an applied file
  and never a change made by hand in the SQL editor (see [MIGRATIONS.md](MIGRATIONS.md)).
- Re-run `supabase/tests/rls-checks.sql` on staging afterwards. It is the only executable check on this
  model.
- Keep `private.is_member()` / `private.is_manager()` as the single spelling of both questions. A new
  policy that inlines `auth.jwt() -> 'app_metadata' ->> 'role'` re-introduces both the per-row cost and
  the chance of a table being left out of the next fix.
- Middleware must stay network-free: the role comes off the verified JWT, never from a query.
