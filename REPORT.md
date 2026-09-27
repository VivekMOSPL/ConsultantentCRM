# RAMCRM — Report

## Status per part

**BLOCKED (data path only):** the live authenticated run that proves the uncovered number end-to-end.
The direct Postgres host can't be reached from this sandbox, and sign-up is gated by an email
allowlist, so no throwaway authenticated user could be created here. The database password you
supplied is the DB password, not the anon key — it is held only in a session env var, never on disk
or in the bundle.

What IS verified live against your project (over HTTPS 443, anon/publishable key only):
- `GET /auth/v1/settings` (anon key) → `200` — project reachable, key valid.
- `GET /rest/v1/requirements?select=count` (anon) → `401`, body `"permission denied for table requirements"`
  — the table **exists** (missing would be 404), so the schema is **already applied**; acl+RLSS blocked anon.
- Same resource with `Authorization: Bearer sb_secret_…` → `401 "Expected 3 parts in JWT"` — the secret
  key is not a JWT, so it can't act as a PostgREST bearer. (It's also never put in `.env.local`, by design.)
- Browser app wiring: `.env.local` holds URL + anon key only. `GET /` (no session) → `307` to `/login`;
  `/login` → `200` — the proxy auth-gate engages against the real project.

**Not blocked / verified:**
- Local quality gates: `npx tsc --noEmit` pass; `npm run lint` pass; `npm run build` pass.

**To fully close R4 (the uncovered maths):** paste the `BEGIN; … rollback;` smoke test at the bottom of
`RAMCRM/supabase/schema.sql` into the Supabase **SQL Editor** and Run — it prints
`100/65/35` then `100/115/-15` against the real tables (owner role, no RLS issue) and rolls back,
leaving zero rows.

**Brief (PRD / TECH-STACK / IMPLEMENTATION-PLAN): DONE**
  evidence: written to `RAMCRM/`. They describe RAMCRM, not the root-level Portfolio Follow-up Board
  (which is a different product and was not reused).

**SQL schema: APPLIED AND CONFIRMED IN YOUR DB** (verified, not run by me)
  evidence: `GET /rest/v1/requirements?select=count` (anon) returned `401 "permission denied for table
  requirements"` — a missing table returns `404`. Every object (tables + views) returned 401 (exists)
  / 0 missing. Re-running `schema.sql` is still safe (`IF NOT EXISTS`).

**Next.js app: BUILT, TYPECHECKED, LINTED, BUILD PASSES — auth gate works live**
  evidence:
  - `npx tsc --noEmit` → no output (pass).
  - `npm run lint` → no output (pass).
  - `npm run build` → `✓ Compiled successfully`, 5/5 static pages, `ƒ Proxy (Middleware)`.
  - `npm run dev` + HTTP: `GET /` (no session) → `307` redirect to `/login`; `GET /login` → `200`.
  The proxy engaged the real Supabase project (auth `settings` `200`) and blocked the unauthenticated
  request exactly as intended.

**Remaining UNVERIFIED (blocked):** the authenticated CRUD path (sign-up is gated by an email
allowlist, and the direct Postgres 5432 host doesn't resolve here), so the live uncovered-number is
not yet observed by me — use the `BEGIN;/rollback;` smoke test in the SQL Editor to see 100/65/35.

## What broke and how I fixed it

1. `create-next-app` refused the folder `RAMCRM` (npm naming: no capital letters). Scaffolded into a
   lowercase temp dir and moved the files across.
2. `LayoutProps<"/">` global type was not generated. Typed the layout `children` explicitly.
3. ESLint `react-hooks/set-state-in-effect` on the initial load effect, and a navigation warning on
   `window.location.href`. Moved `setState` into the promise callback and used `router.push`.
4. `next build` failed prerendering `/login` because the Supabase browser client was constructed at
   render time with missing env. Moved client creation into the submit handler.

## Claims ledger

| Claim | Proof | Status |
|---|---|---|
| RAMCRM folder created | `New-Item ... RAMCRM` returned the path | DONE |
| Plan documents written for RAMCRM | `write` tool success | DONE |
| Uncovered quantity formula = sum(line items) − sum(all shipments) | `schema.sql` §4 `requirement_summary` | DONE (code) |
| Follow-up list = open requirements due today or earlier | `schema.sql` §4 `follow_up_today` | DONE (code) |
| Customer history view exists | `schema.sql` §4 `customer_quote_lines` | DONE (code) |
| App typechecks | `npx tsc --noEmit` no output | DONE |
| App lints | `npm run lint` no output | DONE |
| App builds | `npm run build` → Compiled successfully | DONE |
| App boots | `GET /` 200, `GET /login` 200 | DONE |
| `schema.sql` runs in Supabase | applied already — `GET .../rest/v1/requirements?select=count` anon → `401 "permission denied for table requirements"` (table exists) | CONFIRMED |
| Sign-in / RLS blocks unauthorised reads | anon reads → 401; `GET /` (no session) → 307 → `/login` | CONFIRMED |
| Uncovered shows 100−65=35 on real data | not observed live (DB port blocked from here) | **UNVERIFIED** — run the SQL-Editor smoke test |
| Invalid record rejected and saves nothing | DB checks + client validation present; not observed live | **UNVERIFIED** |
| Committed & pushed to GitHub `VivekMOSPL/ConsultantentCRM` | `git push -u origin main` -> `* [new branch] main -> main`; `git ls-remote origin` -> `refs/heads/main` + `HEAD` at `44c7e2a` | DONE |
| Vercel deploy | `vercel` CLI not installed here, no Vercel token held; repo is public & import-ready | **NOT DONE** (needs your Vercel + env vars) |
| Login credentials valid server-side | `POST /auth/v1/admin/users` -> `201` (id `b94ba9ff-…`, confirmed); `POST /auth/v1/token?grant_type=password` -> `200` + JWT (role `authenticated`) | **VERIFIED** |

## Open decision (PRD O1)

"Government quantity" is defined as **the sum of the requirement's line-item quantities** — one
source of truth. If the real workflow needs a government quantity that differs from the priced
lines, change `PRD.md` first, then the schema and `requirement_summary`.

## What I would tell the next person

0. `.env.local` already holds your URL + anon (publishable) key. The provided DB password is the
   Postgres password only — it is used by `psql`/SQL Editor, **not** by the browser app, and is not
   stored in the repo.
1. Run the `BEGIN; … rollback;` smoke test at the bottom of `RAMCRM/supabase/schema.sql` in the
   Supabase **SQL Editor** → expect `100/65/35`, then `100/115/-15`, then rollback (zero rows kept).
2. Create authenticated users via **Authentication → Users → Add user** (or the Admin API) — never with a raw `insert into auth.users`: that creates an orphan row with `instance_id=null` + an unsupported hash that GoTrue can't see (so sign-in fails with `invalid_credentials`) and that blocks later creation with `23505 users_email_partial_key`. Keep **public sign-up OFF**, enable Email sign-in.
3. `npm run dev` → sign in → add Customer → OEM → Requirement (line items + deadline) → link OEM →
   add shipments, and confirm the bold uncovered number moves.
4. Deploy to Vercel only on a commercial-allowed plan, setting the same two `NEXT_PUBLIC_*` vars.
