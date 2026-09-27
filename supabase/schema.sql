-- =============================================================================
-- RAMCRM — Supabase schema
-- Run this ONCE in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: tables use IF NOT EXISTS, views use CREATE OR REPLACE,
-- policies are dropped before re-creation.
--
-- Design rules (see RAMCRM/TECH-STACK.md):
--   * Money is integer PAISE (never a float), currency fixed to INR.
--   * Deadlines / shipment dates are DATE, not timestamps.
--   * Uncovered quantity = sum(line-item quantities) - sum(all shipments).
--     It is computed in a view, never stored.
--   * Validation lives in the database: an invalid row is rejected and saved nowhere.
--   * RLS is ON for every table; only signed-in (authenticated) users may read/write.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------

create table if not exists public.customers (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null check (btrim(name) <> ''),
  contact_name  text,
  email         text,
  phone         text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.requirements (
  id                   uuid        primary key default gen_random_uuid(),
  customer_id          uuid        not null references public.customers(id) on delete restrict,
  title                text        not null check (btrim(title) <> ''),
  stage                text        not null default 'New'
                                   check (stage in ('New','Quoting','Submitted','Won','Lost')),
  submission_deadline  date        not null,
  follow_up_date       date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- R1: line items (item, quantity, unit price). Quantity here IS the government
-- quantity (PRD O1): government_quantity = sum of these.
create table if not exists public.line_items (
  id                uuid        primary key default gen_random_uuid(),
  requirement_id    uuid        not null references public.requirements(id) on delete cascade,
  item              text        not null check (btrim(item) <> ''),
  quantity          integer     not null check (quantity > 0),
  unit_price_paise  bigint      not null check (unit_price_paise >= 0),
  created_at        timestamptz not null default now()
);

create table if not exists public.oems (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null unique check (btrim(name) <> ''),
  contact_name  text,
  email         text,
  phone         text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- R3: link an OEM to a requirement (one row per OEM per requirement).
create table if not exists public.requirement_oems (
  id              uuid        primary key default gen_random_uuid(),
  requirement_id  uuid        not null references public.requirements(id) on delete cascade,
  oem_id          uuid        not null references public.oems(id) on delete restrict,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (requirement_id, oem_id)
);

-- R3: many shipments per OEM link, each with quantity + expected shipment date.
create table if not exists public.oem_shipments (
  id                  uuid        primary key default gen_random_uuid(),
  requirement_oem_id  uuid        not null references public.requirement_oems(id) on delete cascade,
  quantity            integer     not null check (quantity > 0),
  expected_shipment_date date     not null,
  created_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists idx_requirements_customer   on public.requirements(customer_id);
create index if not exists idx_requirements_deadline   on public.requirements(submission_deadline);
create index if not exists idx_requirements_followup   on public.requirements(follow_up_date);
create index if not exists idx_line_items_requirement  on public.line_items(requirement_id);
create index if not exists idx_req_oems_requirement    on public.requirement_oems(requirement_id);
create index if not exists idx_req_oems_oem            on public.requirement_oems(oem_id);
create index if not exists idx_shipments_req_oem       on public.oem_shipments(requirement_oem_id);

-- -----------------------------------------------------------------------------
-- 3. updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated   on public.customers;
create trigger trg_customers_updated
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_requirements_updated on public.requirements;
create trigger trg_requirements_updated
  before update on public.requirements
  for each row execute function public.set_updated_at();

drop trigger if exists trg_oems_updated on public.oems;
create trigger trg_oems_updated
  before update on public.oems
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. VIEWS  (security_invoker so RLS applies to the caller, not the view owner)
-- -----------------------------------------------------------------------------

-- R4: government quantity, committed quantity, and UNCOVERED quantity per requirement.
-- Sub-selects are used (not a direct join) so line items and shipments never
-- multiply each other's rows.
create or replace view public.requirement_summary
with (security_invoker = true) as
select
  r.id,
  r.customer_id,
  r.title,
  r.stage,
  r.submission_deadline,
  r.follow_up_date,
  r.notes,
  coalesce(li.gov_qty, 0)::bigint                          as government_quantity,
  coalesce(li.gov_value_paise, 0)::bigint                  as government_value_paise,
  coalesce(sh.committed_qty, 0)::bigint                     as committed_quantity,
  (coalesce(li.gov_qty, 0) - coalesce(sh.committed_qty, 0))::bigint as uncovered_quantity
from public.requirements r
left join (
  select requirement_id,
         sum(quantity)                    as gov_qty,
         sum(quantity * unit_price_paise) as gov_value_paise
  from public.line_items
  group by requirement_id
) li on li.requirement_id = r.id
left join (
  select ro.requirement_id,
         sum(s.quantity) as committed_qty
  from public.requirement_oems ro
  join public.oem_shipments s on s.requirement_oem_id = ro.id
  group by ro.requirement_id
) sh on sh.requirement_id = r.id;

-- R5: Follow-up today — open requirements whose deadline OR follow-up date is today or earlier.
create or replace view public.follow_up_today
with (security_invoker = true) as
select *
from public.requirement_summary
where stage not in ('Won', 'Lost')
  and (
    submission_deadline <= current_date
    or (follow_up_date is not null and follow_up_date <= current_date)
  )
order by least(submission_deadline, coalesce(follow_up_date, submission_deadline)) asc;

-- R6: customer past quotes — every line item priced, with its requirement's stage,
-- so a customer's history and lost bids can be shown while pricing a new quote.
create or replace view public.customer_quote_lines
with (security_invoker = true) as
select
  r.customer_id,
  r.id                                  as requirement_id,
  r.title,
  r.stage,
  r.submission_deadline,
  li.id                                 as line_item_id,
  li.item,
  li.quantity,
  li.unit_price_paise,
  (li.quantity * li.unit_price_paise)::bigint as line_value_paise
from public.requirements r
join public.line_items li on li.requirement_id = r.id;

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.customers        enable row level security;
alter table public.requirements     enable row level security;
alter table public.line_items       enable row level security;
alter table public.oems             enable row level security;
alter table public.requirement_oems enable row level security;
alter table public.oem_shipments    enable row level security;

drop policy if exists "authenticated full access" on public.customers;
create policy "authenticated full access" on public.customers
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.requirements;
create policy "authenticated full access" on public.requirements
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.line_items;
create policy "authenticated full access" on public.line_items
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.oems;
create policy "authenticated full access" on public.oems
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.requirement_oems;
create policy "authenticated full access" on public.requirement_oems
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.oem_shipments;
create policy "authenticated full access" on public.oem_shipments
  for all to authenticated using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 6. GRANTS  (authenticated can work; anon gets nothing)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.customers        to authenticated;
grant select, insert, update, delete on public.requirements     to authenticated;
grant select, insert, update, delete on public.line_items       to authenticated;
grant select, insert, update, delete on public.oems             to authenticated;
grant select, insert, update, delete on public.requirement_oems to authenticated;
grant select, insert, update, delete on public.oem_shipments    to authenticated;

grant select on public.requirement_summary   to authenticated;
grant select on public.follow_up_today       to authenticated;
grant select on public.customer_quote_lines  to authenticated;

revoke all on public.customers        from anon;
revoke all on public.requirements     from anon;
revoke all on public.line_items       from anon;
revoke all on public.oems             from anon;
revoke all on public.requirement_oems from anon;
revoke all on public.oem_shipments    from anon;
revoke all on public.requirement_summary  from anon;
revoke all on public.follow_up_today      from anon;
revoke all on public.customer_quote_lines from anon;

-- =============================================================================
-- 7. PROVE IT (optional smoke test for the SQL Editor — read-only proof)
-- =============================================================================
-- Copy the block below (starting at "BEGIN;") into a NEW SQL Editor tab and Run.
-- It inserts a throwaway requirement and proves the uncovered-quantity maths, then
-- ROLLBACKs, so ZERO rows are left in your database. Expected output (two rows):
--
--   proof                         | government_quantity | committed_quantity | uncovered_quantity
--   ----------------------------- | ------------------- | ------------------ | -------------------
--   gov=100 committed=65 uncovered=35  | 100 | 65 | 35
--   gov=100 committed=115 uncovered=-15| 100 | 115| -15
--
BEGIN;
WITH c as (
  insert into public.customers(name) values ('RAMCRM Smoke Customer') returning id
), r as (
  insert into public.requirements(customer_id, title, submission_deadline)
    select id, '5.56mm ammunition', current_date + 5 from c returning id
), li as (
  insert into public.line_items(requirement_id, item, quantity, unit_price_paise)
    select id, 'Rifle', 100, 500000 from r returning id
), o as (
  insert into public.oems(name) values ('RAMCRM Smoke OEM') returning id
), ro as (
  insert into public.requirement_oems(requirement_id, oem_id)
    select (select id from r), (select id from o) returning id
), sh1 as (
  insert into public.oem_shipments(requirement_oem_id, quantity, expected_shipment_date)
    select id, 65, current_date + 10 from ro returning id
)
select 'gov=100 committed=65 uncovered=35' as proof,
       rs.government_quantity, rs.committed_quantity, rs.uncovered_quantity
from public.requirement_summary rs
join public.requirements r2 on r2.id = rs.id
join public.customers c on c.id = r2.customer_id
where c.name = 'RAMCRM Smoke Customer';

-- Second shipment on the SAME OEM link (proves "many shipments per OEM").
insert into public.oem_shipments(requirement_oem_id, quantity, expected_shipment_date)
select ro.id, 50, current_date + 11
from public.requirement_oems ro
join public.requirements r2 on r2.id = ro.requirement_id
join public.customers c on c.id = r2.customer_id
where c.name = 'RAMCRM Smoke Customer';

select 'gov=100 committed=115 uncovered=-15' as proof,
       rs.government_quantity, rs.committed_quantity, rs.uncovered_quantity
from public.requirement_summary rs
join public.requirements r2 on r2.id = rs.id
join public.customers c on c.id = r2.customer_id
where c.name = 'RAMCRM Smoke Customer';

-- government_quantity comes from the line items (100). committed_quantity is the sum
-- of every shipment across every OEM (65, then 65+50=115). uncovered is NOT clamped,
-- so an over-commitment shows as a negative (35, then -15).
rollback;
-- No rows are written. Re-running is safe.
