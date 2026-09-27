# RAMCRM — Tech Stack

**Status: DRAFT** — companion to `PRD.md` and `IMPLEMENTATION-PLAN.md`.
**Required by the brief:** Next.js on Vercel, Supabase for data. Those two are fixed; everything
below is the smallest thing that satisfies them.

The scale: **one internal user**, one page, four tabs, a handful of writes a day, small reads. Every
enterprise reflex — queues, caches, realtime, microservices — is a running cost with no matching
constraint, so each is refused explicitly in §4.

---

## 1. The stack

| Layer | Choice | Why (the constraint that forced it) |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | Required by the brief. One page, tabs, client-side forms. |
| Styling | **Tailwind CSS** | Small headless UI; no component library worth its install at this size. |
| Hosting | **Vercel** | Required by the brief. Note: Vercel's free Hobby tier is *non-commercial*; a business tool needs Pro or acceptance of that term. Flagged, not silently ignored. |
| Database | **Supabase Postgres** | Required by the brief. The core is joins and aggregates (uncovered = sum − sum), which is exactly SQL's job. |
| Auth | **Supabase Auth (email + password), invite-only** | The data is commercially sensitive (bid prices, lost bids). The browser holds only the public anon key; authority comes from Row Level Security. |
| Client data access | **`@supabase/ssr` + `supabase-js` with the anon key, RLS-enforced** | No API server needed: every read/write is a table or view authorised by RLS. Keeps the host swappable. |
| Secrets | `.env.local`, keys server-side where privileged; anon key is public by design | AGENTS.md §8. The `service_role` key is **never** used in the app and never committed. |

**Rejected, and why:** an application server (nothing needs privilege RLS cannot express); a
document/key-value store (the uncovered total depends on joins); a spreadsheet (no enforced "invalid
record saves nothing" rule, no concurrency, no history); money as a float (totals must reconcile);
Next.js API routes for ordinary CRUD (couples logic to the host for no gain).

---

## 2. Data rules the features specifically demand

- **Money as integer paise, currency fixed to INR.** Never a float — the uncovered and quote totals
  must reconcile exactly. *(PRD A1.)*
- **Deadlines and shipment dates are `date`, not `timestamptz`.** A 31 March deadline must not
  become 30 March. *(PRD A2.)*
- **Uncovered quantity is a computed view, not a stored number.** One aggregate query over
  line items and shipments; nothing to go stale and disagree with the rows beneath it.
  *(PRD R4.)*
- **Validation in the database, not only the form.** Required fields are `NOT NULL` with
  non-blank `CHECK`s; quantities are `> 0`; stages are constrained to the five values. An invalid
  record is rejected with a reason and saves nothing. *(AGENTS.md §3.)*
- **Government quantity = sum of line-item quantities** (PRD O1), so a second field cannot
  disagree with the priced lines.
- **Over-commitment is shown, not clamped.** Uncovered may be negative; it is displayed as-is.
  *(PRD A4.)*

---

## 3. Security posture

- Row Level Security **on for every table**; policies allow only the `authenticated` role.
- Public sign-up is **off** in the Supabase project; the one user is created by hand/invite.
- The `anon` key is safe in the browser *because* RLS is the gate. The `service_role` key never
  reaches the client.
- Views are created `with (security_invoker = true)` so they cannot leak past RLS.

---

## 4. Deliberately not building

Realtime websockets, a cache layer, a queue, a search engine, object storage, microservices,
container orchestration, a BI tool, and a native mobile app. Each adds a running cost that one user
and one page do not justify.

---

## 5. The one limit that would force a change

Supabase free projects **pause after a week of inactivity**. For a tool opened daily this is
unlikely, but a quiet fortnight pauses it and the app is dark until someone un-pauses. The fix is
the paid tier (a billing change). This is the only limit worth watching at this scale.

---

## 6. Config switch vs rewrite

- **Config:** free → paid on Supabase or Vercel; adding columns/views; cron frequency; swapping host
  *provided* logic stays in the database, not the host's runtime.
- **Rewrite:** changing database engine; introducing realtime (changes how every screen loads);
  moving logic onto the host's proprietary runtime.
