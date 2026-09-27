# RAMCRM

A one-page CRM for Ram Prasad, a defence contract consultant. Next.js (App Router) on Vercel,
Supabase (Postgres + Auth) for data.

Four tabs: **Requirements**, **Follow-up today**, **Customers**, **OEMs**.

## What it does

- Add a requirement: title, line items (item, quantity, unit price), submission deadline.
- Move it through New → Quoting → Submitted → Won → Lost.
- Link any number of OEMs to a requirement; each OEM can have many shipments
  (quantity + expected shipment date).
- **Uncovered quantity** — government quantity minus the sum of every OEM shipment — shown in bold
  at the top of the requirement, recomputed live.
- **Follow-up today** — open requirements whose deadline or follow-up date is today or earlier.
- **Past quotes** — a customer's earlier quotes, prices, and lost bids, shown while pricing.

## Setup

### 1. Database

1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, and Run.
   It creates the tables, the `requirement_summary` view (the uncovered-quantity maths),
   `follow_up_today`, `customer_quote_lines`, row-level security, and grants.
   Safe to re-run.
3. Optional: uncomment the smoke test at the bottom of the file to prove the maths
   (100 − 65 = 35), then follow the cleanup lines.

### 2. Authentication

1. **Authentication → Providers → Email**: enable it.
2. **Authentication → Sign In / Providers**: turn **off** public sign-up.
3. **Authentication → Users → Add user**: create the one account with a password.

### 3. Environment

```bash
cp .env.local.example .env.local
```

Paste the **Project URL** and **anon public key** from
**Project Settings → API** into `.env.local`. The anon key is safe in the browser because
row-level security is on. The `service_role` key must never be used here.

### 4. Run

```bash
npm install
npm run dev      # http://localhost:3000
```

## Checks

```bash
npm run lint         # ESLint
npx tsc --noEmit     # typecheck
npm run build        # production build
```

## Deploying

Vercel's free Hobby tier is for non-commercial use. A business deployment needs Vercel Pro (or
another commercial-allowed host). Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project's environment variables — the local
`.env.local` is not uploaded.
