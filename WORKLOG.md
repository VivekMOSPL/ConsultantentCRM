# RAMCRM — Worklog

One line per slice: `<what I did> -> <the command I ran> -> <what it actually printed>`

- Confirmed no RAMCRM brief existed; root PRD/TECH-STACK/IMPLEMENTATION-PLAN describe a different product (Portfolio Follow-up Board) -> `read` on the three files -> they are the wealth-advisory board, not RAMCRM. Recorded rather than reused.
- Wrote RAMCRM brief -> `write PRD.md, TECH-STACK.md, IMPLEMENTATION-PLAN.md` -> files written.
- Wrote database schema -> `write supabase/schema.sql` -> file written.
- Scaffolded Next.js (create-next-app rejects capitalised folder names, so scaffolded lowercase then moved) -> `npx --yes create-next-app@latest <temp> --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes` -> "Success! Created ramcrm-scaffold". Moved all but `.git` and `node_modules` into RAMCRM, then `npm install` -> "added 364 packages ... found 0 vulnerabilities"; `npm install @supabase/supabase-js @supabase/ssr` -> "added 10 packages".
- Read Next 16 breaking-change docs (middleware→proxy, async cookies) -> `read node_modules/next/dist/docs/.../version-16.md` and `16-proxy.md` -> confirmed: use `proxy.ts`, `await cookies()`.
- Wrote app: proxy, supabase clients, api, 4 tabs -> `write ...` -> files written.
- Typecheck -> `npx tsc --noEmit` -> first run: `app/layout.tsx(20,50): error TS2304: Cannot find name 'LayoutProps'`. Fixed by typing children explicitly. Re-run -> no output (pass).
- Lint -> `npm run lint` -> first run: 1 error `react-hooks/set-state-in-effect` in Dashboard, 1 warning `no-location-assign-relative-destination`. Fixed both (state in promise callback; router.push). Re-run -> no output (pass).
- Build -> `npm run build` -> first run failed prerendering `/login`: "@supabase/ssr: Your project's URL and API key are required". Fixed by creating the client at submit time. Re-run -> "✓ Compiled successfully", 5/5 static pages generated, routes `/`, `/_not-found`, `/login`, "ƒ Proxy (Middleware)".
- Runtime check with no keys -> started `npm run dev`, then `Invoke-WebRequest http://localhost:3000/` -> `GET / -> 200`, body contains "database not configured"; `GET /login -> 200`, body contains "Sign in". Dev server stopped.
- NOT DONE / UNVERIFIED: running against a real Supabase project (no URL/key provided), so schema execution, auth, and all CRUD are unproven on live data.
- Attempted to run `schema.sql` against the database the member supplied (host `odyjrwwsqgfskjaitmzz`). Did NOT succeed:
  - `db.odyjrwwsqgfskjaitmzz.supabase.co` (the direct DB host in the supplied DSN): DNS → "No such host is known" (`ENOTFOUND`).
  - `odyjrwwsqgfskjaitmzz.supabase.co` (resolves to 172.64.149.246 / 104.18.38.10, Cloudflare-proxied): connect → `ETIMEDOUT`.
  - Scratch runner + `pg` were removed after the attempt; the supplied password was held only in a
    session env var and was never written to disk or echoed.
  - The schema SQL itself was reviewed for the function body ($$-blocks) statement splitter used.

- Wrote `.env.local` (URL + anon/publishable key only; the secret key deliberately NOT stored) -> `write .env.local` -> file written (gitignored).
- Rewrote the schema's smoke-test block as a transactional BEGIN/ROLLBACK using UUID RETURNING CTEs (no `_id_seq`, since PKs are UUIDs) -> `edit supabase/schema.sql` -> file updated; not run here (DB port unreachable).
- Live HTTP checks against the real project (curl on `localhost` dev server and on the Supabase REST/Auth endpoints over 443):
  - `GET https://odyjrwwsqgfskjaitmzz.supabase.co/auth/v1/settings` (anon key) -> `200`, body includes `"external":{"email":true}` and signup flag true.
  - `GET .../rest/v1/requirements?select=count` (anon) -> `401` `{code:"42501","message":"permission denied for table requirements"}` -> table EXISTS; a missing table would be 404. anon is blocked by the applied RLS.
  - Same resource with `Authorization: Bearer <sb_secret_...>` -> `401` `Expected 3 parts in JWT; got 1`; the `sb_secret_...` key is not a JWT, so it cannot act as a PostgREST/Auth bearer from here.
  - Dev server with `.env.local` set: `GET http://localhost:3000/` (no session) -> `307` redirect to `/login`; `GET /login` -> `200`. (proxy.ts:18ms, application-code:152ms)
- Committed & pushed to a NEW GitHub repo for this app -> `git init -b main; git add -A; git commit; gh repo create VivekMOSPL/ConsultantentCRM --public; git push -u origin main` -> `* [new branch] main -> main`; `git ls-remote origin` -> `HEAD` + `refs/heads/main` both at `44c7e2a "Initial commit: Consultantent CRM"`; staged 39 files, no `.env`/secret lines (gitignored). Build still green: `npm run build` -> `✓ Compiled successfully`, 5/5 static pages, exit 0.
- Vercel deploy: NOT performed by me — `vercel` CLI not installed in this sandbox and no Vercel token/credentials held. Repo is public and ready to import; Vercel env vars must be set by you.
