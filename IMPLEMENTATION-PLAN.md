# RAMCRM — Implementation Plan

**Status: DRAFT** — companion to `PRD.md` and `TECH-STACK.md`.

Rules that order this plan:
1. Every step ends in something **visible** — a screen or a real query result, not "the schema
   migrated".
2. **"Done" means built + run + the real output read.** Built without run does not count.
3. Hard-to-reverse decisions land early, while they are cheap.
4. A mistake should surface as early as possible.

---

## 1. Order

### Step 0 — Brief and schema (this document set)
**Builds:** `PRD.md`, `TECH-STACK.md`, this plan, and `supabase/schema.sql`.
**Gate:** the member runs `schema.sql` in the Supabase SQL Editor. Open item **O1**
(government quantity = sum of line items) is confirmed or corrected here, before app code.
**Verify:** SQL runs with no error in the SQL Editor; the summary view returns rows.

### Step 1 — Walking skeleton
**Builds:** the Next.js app in `RAMCRM/`, Tailwind, Supabase connection, sign-in, and one hardcoded
requirement row read from the database.
**Visible:** sign in, see a row. Signed out, the page is inaccessible.
**Verify:** run `npm run dev`, fetch the page, sign in, read a real row from Supabase. Paste both.
Confirm the `service_role` key is nowhere in the browser bundle.

### Step 2 — Requirements tab (R1, R2)
**Builds:** create/edit a requirement with customer, title, deadline, optional follow-up date, and
line items (item, quantity, unit price); stage control across the five values.
**Visible:** add a real requirement, move it through stages, reload, it persisted.
**Verify (edge cases — AGENTS.md §3):**
- Submit with a blank title / blank item / quantity 0 / negative price → **rejected with a reason,
  nothing saved** (row count unchanged). Paste it.
- A known paise amount round-trips exactly.

### Step 3 — Uncovered quantity (R4) — the part that must work hardest
**Builds:** the summary view wired to the requirement header, in bold.
**Visible:** the uncovered number at the top of a requirement.
**Verify:** a requirement with line items totalling 100, one OEM with shipments 40 + 25, shows
**35**. Add a second OEM shipment of 35 → shows **0**. Add 10 more → shows **−10**, not 0. Worked by
hand and pasted.

### Step 4 — OEMs and shipments (R3)
**Builds:** link OEMs to a requirement; add many shipments per OEM link.
**Visible:** OEMs and their shipments under a requirement; committed quantity sums them.
**Verify:** two shipments on one OEM show the summed committed quantity; the uncovered number moves
accordingly.

### Step 5 — Follow-up today (R5)
**Builds:** the Follow-up tab.
**Visible:** a requirement dated yesterday is listed; a `Won` requirement dated yesterday is not.
**Verify:** paste the before/after of changing a date.

### Step 6 — Past quotes (R6)
**Builds:** on a requirement, that customer's other quotes, line-item prices, and lost bids.
**Visible:** a customer with a prior `Lost` bid shows it with its prices.
**Verify:** paste the prior bid and its line-item prices next to the new one.

### Step 7 — Hardening
Empty states, error states, loading, and a narrow-width pass. Re-run Step 2's rejection tests
against the finished UI.

---

## 2. If the time slips — cut ladder (cut from the top)

1. Step 7 polish (keep the re-run of the rejection tests — that is correctness, not polish).
2. Step 6 past-quotes niceties (keep the lost-bid list; drop price charts).
3. Step 4's multi-shipment UI (data model keeps many shipments; UI could start with one).

**Never cut:** Steps 2–3 (core), sign-in, database-level validation and its rejection test, and the
real-data slice.

---

## 3. Exit criteria for v1

- [ ] A requirement with line items and a deadline can be created and moved through all five stages.
- [ ] Uncovered quantity is bold at the top and equals line-item total − all shipments, checked by hand.
- [ ] Follow-up today shows due/overdue and hides Won/Lost.
- [ ] Past quotes show a customer's earlier prices and lost bids.
- [ ] An invalid requirement/line item/shipment is rejected and saves nothing (pasted evidence).
