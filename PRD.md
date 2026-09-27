# RAMCRM — Product Requirements

**Status: DRAFT** — brief supplied in chat by the member on 2026-09-27.
**Built for:** Ram Prasad, defence contract consultant.
**Companion documents:** `TECH-STACK.md`, `IMPLEMENTATION-PLAN.md`.

This document answers one question: *what are we building, and for whom.* It contains no
technology choices — those live in `TECH-STACK.md`.

---

## 1. Who this is for

**Ram Prasad — defence contract consultant (the only user stated).**
Job to be done: track a government requirement from "new" through to "won/lost", price it against a
customer's own history, line up OEM supply commitments and shipment dates, and always know how much
of the government quantity is still **uncovered** by those commitments.

The brief is written for one person ("Ram Prasad"). Nothing in the brief asks for a team, roles, or
per-advisor scoping, so this is a **single-user internal tool**. It is still login-walled: the data
is commercially sensitive (customer bid prices, lost bids, OEM commitments) and must not be public.

**Explicitly not a user:** the government buyer, the OEMs, and Ram's customers. Nothing in the brief
puts any of them in front of this app.

---

## 2. The six required capabilities

Each item is the member's own wording, then what it means for the build.

### R1 — Add a requirement
> "title, line items (item, quantity, unit price), and a submission deadline."

A requirement belongs to a customer, has a title, one or more line items, and a submission deadline
(date). Line items are entered as a list: item name, quantity, unit price.

### R2 — Move it through stages
> "New, Quoting, Submitted, Won, Lost."

Exactly five stages, in that vocabulary. The stage is changed explicitly by the user. `Won` and
`Lost` are terminal and are excluded from the follow-up list.

### R3 — Link OEMs to a requirement
> "Each OEM commitment has a quantity and an expected shipment date. One requirement can have many
> OEMs and many shipments."

An OEM is linked to a requirement. Each link can hold **many shipments**, each shipment carrying a
quantity and an expected shipment date. The OEM's committed quantity for a requirement is the sum
of its shipments.

### R4 — Uncovered quantity (the part that must work hardest)
> "Government quantity minus the sum of all OEM commitments, across every OEM and shipment, in bold
> at the top of the requirement."

```
uncovered_quantity = government_quantity
                   − Σ (quantity of every shipment, across every OEM linked to this requirement)
```

Shown in bold at the top of the requirement. It is computed live from the data, never typed in.

**Open item O1 — where "government quantity" comes from (see §4).** The brief gives line items a
quantity *and* refers to a "government quantity" as if it is one number. This document takes the
line-item quantities as the government requirement and defines **government quantity = the sum of
the requirement's line-item quantities**, so there is one source of truth and no field can disagree
with the line items. This must be confirmed (see §4).

### R5 — "Follow-up today" list
> "anything with a deadline or follow-up date of today or earlier."

A requirement appears when it is not `Won`/`Lost` and either its submission deadline or its
optional follow-up date is today or in the past.

### R6 — Past quotes when pricing a new quote
> "When pricing a new quote, show that customer's past quotes, prices and lost bids."

When working on a requirement, show the same customer's other requirements: their line-item prices,
their stages, and in particular their **lost** bids. This is a read-only view for reference while
pricing.

---

## 3. Scope, locked

What a person must be able to see happen:

1. Sign in, see one page with tabs.
2. Add / edit a customer.
3. Add a requirement: customer, title, submission deadline, optional follow-up date, stage,
   and one or more line items (item, quantity, unit price).
4. Move a requirement through New → Quoting → Submitted → Won → Lost.
5. Link one or many OEMs to a requirement.
6. Add one or many shipments (quantity + expected shipment date) to each OEM link.
7. See the **uncovered quantity in bold at the top of the requirement**, updating live.
8. See a **Follow-up today** tab listing everything due today or earlier.
9. On a requirement, see that **customer's past quotes, prices, and lost bids**.

### Tabs (one page)
- **Requirements** — list + create/edit; the detail view holds R1, R2, R3, R4, R6.
- **Follow-up today** — R5.
- **Customers** — R1's parent records.
- **OEMs** — R3's parent records.

---

## 4. Open item to confirm before this is final

- **O1 — Government quantity source.** Taken as *the sum of line-item quantities* (§R4). The
  alternative reading is a single separate "government quantity" field on the requirement. The
  chosen reading keeps one source of truth; if the real workflow needs a government quantity that
  differs from the priced line items, this document changes first and the schema follows.

Other recorded assumptions (guesses to replace, not requirements):

- **A1** Currency is INR, stored as integer paise (no floats).
- **A2** Deadline and follow-up dates are calendar dates, not instants.
- **A3** Single user, no roles; login is required.
- **A4** A requirement's uncovered quantity may be **negative** when OEMs over-commit. It is shown
  as a negative number, not clamped to zero and not hidden — an over-commitment is a fact worth
  seeing.
- **A5** One requirement = one quote round. Versioning of re-quotes is out of scope.

---

## 5. Not building, and why

- **Not a sending tool.** No emails or messages to customers/OEMs.
- **Not a document store.** No file attachments.
- **Not invoicing / accounting / payments.**
- **Not multi-user roles or permissions beyond "signed in".**
- **Not multi-currency.**
- **Not a native mobile app.** One responsive web page.

---

## 6. Success — what "done" means

- A requirement can be created with line items and a deadline, and the stage moved through all five
  values.
- An OEM with two shipments shows a committed quantity equal to the sum of both shipments; the
  uncovered quantity above it equals line-item total minus that sum, proven by hand on a worked
  example.
- The Follow-up tab shows a requirement dated yesterday, and hides a `Won` one dated yesterday.
- A customer with a prior `Lost` bid shows that bid and its prices on a new requirement.
