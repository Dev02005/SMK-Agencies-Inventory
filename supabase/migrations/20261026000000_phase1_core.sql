-- Phase 1 core: users and roles, masters, parties, sales, receipts, ledger, stock and audit log.
-- Money moves only through ledger_entries and stock only through stock_movements,
-- so every balance is a sum that can be traced back to a bill.

-- ── Types ────────────────────────────────────────────────────────────────────
create type public.app_role as enum ('owner', 'office', 'godown', 'field', 'driver');
create type public.party_kind as enum ('cash', 'customer', 'sub_dealer', 'company', 'lorry_owner', 'other');
create type public.product_unit as enum ('bag', 'kg');
create type public.product_category as enum ('cement', 'steel');
create type public.transport_mode as enum ('FOR', 'EX', 'RENT');
create type public.discount_mode as enum ('amount', 'percent');
create type public.stock_source as enum ('godown', 'lorry', 'van');
create type public.sale_status as enum ('saved', 'pending_approval', 'cancelled');
create type public.payment_mode as enum ('cash', 'upi', 'cheque', 'neft', 'other');

-- ── Users and roles ──────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  mobile text unique,
  role public.app_role not null default 'field',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Role of the signed-in user; null when signed out or deactivated.
create function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.has_role(variadic roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = any (roles), false)
$$;

-- ── Masters ──────────────────────────────────────────────────────────────────
create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  address text,
  created_at timestamptz not null default now()
);

create table public.godowns (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  name text not null,
  place text,
  active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.product_category not null,
  unit public.product_unit not null,
  list_rate numeric(12, 2) not null check (list_rate >= 0),
  active boolean not null default true
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.party_kind not null default 'customer',
  place text,
  area_id uuid references public.areas (id),
  mobile text,
  email text,
  gstin text,
  -- Null = no credit allowed (walk-in cash customer).
  credit_limit numeric(14, 2) check (credit_limit is null or credit_limit >= 0),
  opening_balance numeric(14, 2) not null default 0,
  assigned_to uuid references public.profiles (id),
  remarks text,
  active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ── Sales ────────────────────────────────────────────────────────────────────
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  bill_no bigint generated always as identity unique,
  firm_id uuid not null references public.firms (id),
  party_id uuid not null references public.parties (id),
  bill_date date not null default current_date,
  received_date date,
  source public.stock_source not null default 'godown',
  godown_id uuid references public.godowns (id),
  vehicle_no text,
  discount_mode public.discount_mode not null default 'amount',
  discount_value numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  transport_mode public.transport_mode not null default 'FOR',
  transport_charge numeric(14, 2) not null default 0,
  unloading_charge numeric(14, 2) not null default 0,
  other_charge numeric(14, 2) not null default 0,
  subtotal numeric(14, 2) not null,
  total numeric(14, 2) not null,
  destination text,
  paper_memo text,
  remarks text,
  status public.sale_status not null default 'saved',
  -- Why an over-limit, high-discount or changed-rate bill was allowed.
  override_reason text,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  cancel_reason text,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint godown_needed check (source <> 'godown' or godown_id is not null),
  constraint ex_has_no_transport check (transport_mode <> 'EX' or transport_charge = 0)
);

create table public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty numeric(12, 3) not null check (qty > 0),
  unit public.product_unit not null,
  rate numeric(12, 2) not null check (rate >= 0),
  list_rate numeric(12, 2) not null,
  amount numeric(14, 2) generated always as (round(qty * rate, 2)) stored,
  -- 20 bags = 1 MT of cement; 1000 kg = 1 MT of steel.
  mt numeric(12, 4) generated always as (case unit when 'bag' then qty / 20 else qty / 1000 end) stored
);

-- ── Money ────────────────────────────────────────────────────────────────────
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  party_id uuid not null references public.parties (id),
  receipt_date date not null default current_date,
  amount numeric(14, 2) not null check (amount > 0),
  mode public.payment_mode not null,
  reference text,
  collected_by uuid references public.profiles (id),
  paper_memo text,
  remarks text,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Debit = the party owes us more (a sale); credit = the party paid (a receipt).
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  party_id uuid not null references public.parties (id),
  entry_date date not null,
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  narration text,
  sale_id uuid references public.sales (id),
  receipt_id uuid references public.receipts (id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.ledger_entries (party_id, entry_date);

-- ── Stock ────────────────────────────────────────────────────────────────────
-- Signed quantity: positive = inward, negative = dispatch. Balance = sum.
create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id),
  godown_id uuid references public.godowns (id),
  vehicle_no text,
  movement_date date not null,
  qty numeric(12, 3) not null check (qty <> 0),
  note text,
  sale_id uuid references public.sales (id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint has_location check (godown_id is not null or vehicle_no is not null)
);
create index on public.stock_movements (product_id, godown_id);

-- ── Audit log ────────────────────────────────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text not null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  reason text,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (table_name, row_id, action, old_values, new_values)
  values (
    tg_table_name,
    coalesce(new.id, old.id)::text,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_parties after insert or update or delete on public.parties
  for each row execute function public.audit_row();
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row();
create trigger audit_sales after update or delete on public.sales
  for each row execute function public.audit_row();
create trigger audit_receipts after update or delete on public.receipts
  for each row execute function public.audit_row();

-- ── Balances ─────────────────────────────────────────────────────────────────
create view public.party_balances with (security_invoker = true) as
select
  p.id as party_id,
  p.name,
  p.credit_limit,
  p.opening_balance + coalesce(sum(l.debit - l.credit), 0) as outstanding
from public.parties p
left join public.ledger_entries l on l.party_id = p.id
group by p.id;

create view public.stock_balances with (security_invoker = true) as
select product_id, godown_id, vehicle_no, sum(qty) as qty
from public.stock_movements
group by product_id, godown_id, vehicle_no;

-- ── Posting ──────────────────────────────────────────────────────────────────
-- Writes the ledger debit and stock dispatch for a saved sale.
create function public.post_sale_entries(p_sale_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.sales;
begin
  select * into s from public.sales where id = p_sale_id;
  insert into public.ledger_entries (party_id, entry_date, debit, narration, sale_id)
  values (s.party_id, s.bill_date, s.total, 'Sale bill ' || s.bill_no, s.id);

  insert into public.stock_movements (product_id, godown_id, vehicle_no, movement_date, qty, note, sale_id)
  select l.product_id, s.godown_id, s.vehicle_no, s.bill_date, -l.qty, 'Sale bill ' || s.bill_no, s.id
  from public.sale_lines l where l.sale_id = s.id;
end;
$$;

-- Saves a sale in one transaction. Totals and limits are worked out here, never trusted from the browser.
-- Over the credit limit, above the role's discount limit or with a changed rate:
--   owner → saved with a required reason; anyone else → pending_approval, posted only when the owner approves.
create function public.create_sale(payload jsonb) returns public.sales
language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role := public.my_role();
  v_party public.parties;
  v_line jsonb;
  v_product public.products;
  v_subtotal numeric := 0;
  v_discount numeric;
  v_transport numeric;
  v_total numeric;
  v_outstanding numeric;
  v_rate_changed boolean := false;
  v_needs_approval boolean;
  v_max_discount numeric;
  v_reason text := nullif(trim(payload ->> 'override_reason'), '');
  v_sale public.sales;
begin
  if v_role is null or v_role not in ('owner', 'office', 'field') then
    raise exception 'Not allowed to create sales';
  end if;

  select * into v_party from public.parties where id = (payload ->> 'party_id')::uuid and active;
  if not found then
    raise exception 'Party not found';
  end if;

  if jsonb_array_length(coalesce(payload -> 'lines', '[]')) = 0 then
    raise exception 'A sale needs at least one item';
  end if;

  for v_line in select * from jsonb_array_elements(payload -> 'lines') loop
    select * into v_product from public.products where id = (v_line ->> 'product_id')::uuid and active;
    if not found then
      raise exception 'Product not found';
    end if;
    v_subtotal := v_subtotal + round((v_line ->> 'qty')::numeric * (v_line ->> 'rate')::numeric, 2);
    v_rate_changed := v_rate_changed or (v_line ->> 'rate')::numeric <> v_product.list_rate;
  end loop;

  v_discount := case coalesce(payload ->> 'discount_mode', 'amount')
    when 'percent' then round(v_subtotal * coalesce((payload ->> 'discount_value')::numeric, 0) / 100, 2)
    else coalesce((payload ->> 'discount_value')::numeric, 0)
  end;
  v_discount := least(greatest(v_discount, 0), v_subtotal);
  v_transport := case when payload ->> 'transport_mode' = 'EX' then 0
    else coalesce((payload ->> 'transport_charge')::numeric, 0) end;
  v_total := v_subtotal - v_discount + v_transport
    + coalesce((payload ->> 'unloading_charge')::numeric, 0)
    + coalesce((payload ->> 'other_charge')::numeric, 0);

  select outstanding into v_outstanding from public.party_balances where party_id = v_party.id;
  -- Same proposal as the app: field staff 1%, office 2%, owner any.
  v_max_discount := case v_role when 'owner' then 100 when 'office' then 2 else 1 end;
  v_needs_approval :=
    (v_party.credit_limit is not null and v_outstanding + v_total > v_party.credit_limit)
    or (v_subtotal > 0 and v_discount / v_subtotal * 100 > v_max_discount);

  if v_party.credit_limit is null and v_party.kind <> 'cash' then
    raise exception 'This party has no credit limit set';
  end if;
  if (v_rate_changed or (v_needs_approval and v_role = 'owner')) and v_reason is null then
    raise exception 'A reason is required for this bill';
  end if;

  insert into public.sales (
    firm_id, party_id, bill_date, received_date, source, godown_id, vehicle_no,
    discount_mode, discount_value, discount_amount, transport_mode, transport_charge,
    unloading_charge, other_charge, subtotal, total, destination, paper_memo, remarks,
    status, override_reason, approved_by, approved_at
  ) values (
    (payload ->> 'firm_id')::uuid,
    v_party.id,
    coalesce((payload ->> 'bill_date')::date, current_date),
    (payload ->> 'received_date')::date,
    coalesce((payload ->> 'source')::public.stock_source, 'godown'),
    (payload ->> 'godown_id')::uuid,
    nullif(payload ->> 'vehicle_no', ''),
    coalesce((payload ->> 'discount_mode')::public.discount_mode, 'amount'),
    coalesce((payload ->> 'discount_value')::numeric, 0),
    v_discount,
    coalesce((payload ->> 'transport_mode')::public.transport_mode, 'FOR'),
    v_transport,
    coalesce((payload ->> 'unloading_charge')::numeric, 0),
    coalesce((payload ->> 'other_charge')::numeric, 0),
    v_subtotal,
    v_total,
    payload ->> 'destination',
    payload ->> 'paper_memo',
    payload ->> 'remarks',
    (case when v_needs_approval and v_role <> 'owner' then 'pending_approval' else 'saved' end)::public.sale_status,
    v_reason,
    case when v_needs_approval and v_role = 'owner' then auth.uid() end,
    case when v_needs_approval and v_role = 'owner' then now() end
  ) returning * into v_sale;

  insert into public.sale_lines (sale_id, product_id, qty, unit, rate, list_rate)
  select v_sale.id, p.id, (l ->> 'qty')::numeric, p.unit, (l ->> 'rate')::numeric, p.list_rate
  from jsonb_array_elements(payload -> 'lines') l
  join public.products p on p.id = (l ->> 'product_id')::uuid;

  if v_sale.status = 'saved' then
    perform public.post_sale_entries(v_sale.id);
  end if;

  insert into public.audit_log (table_name, row_id, action, new_values, reason)
  values ('sales', v_sale.id::text, 'insert', to_jsonb(v_sale), v_reason);

  return v_sale;
end;
$$;

-- Owner approves a pending bill: it is posted to the ledger and stock at that moment.
create function public.approve_sale(p_sale_id uuid, p_reason text) returns public.sales
language plpgsql security definer set search_path = public as $$
declare
  v_sale public.sales;
begin
  if not public.has_role('owner') then
    raise exception 'Only the owner can approve bills';
  end if;
  update public.sales
     set status = 'saved', approved_by = auth.uid(), approved_at = now(),
         override_reason = coalesce(nullif(trim(p_reason), ''), override_reason)
   where id = p_sale_id and status = 'pending_approval'
  returning * into v_sale;
  if not found then
    raise exception 'No pending bill with that id';
  end if;
  perform public.post_sale_entries(v_sale.id);
  return v_sale;
end;
$$;

-- A receipt posts its ledger credit automatically.
create function public.post_receipt() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ledger_entries (party_id, entry_date, credit, narration, receipt_id)
  values (new.party_id, new.receipt_date, new.amount, 'Receipt ' || new.mode, new.id);
  return new;
end;
$$;

create trigger receipts_post_ledger after insert on public.receipts
  for each row execute function public.post_receipt();

-- ── Row level security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.firms enable row level security;
alter table public.godowns enable row level security;
alter table public.products enable row level security;
alter table public.areas enable row level security;
alter table public.parties enable row level security;
alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;
alter table public.receipts enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_log enable row level security;

-- Profiles: everyone sees their own; owner and office see all; only the owner changes roles.
create policy "read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role('owner', 'office'));
create policy "owner manages profiles" on public.profiles for all to authenticated
  using (public.has_role('owner')) with check (public.has_role('owner'));

-- Masters: every active user reads; owner and office edit.
create policy "read firms" on public.firms for select to authenticated using (public.my_role() is not null);
create policy "edit firms" on public.firms for all to authenticated
  using (public.has_role('owner')) with check (public.has_role('owner'));
create policy "read godowns" on public.godowns for select to authenticated using (public.my_role() is not null);
create policy "edit godowns" on public.godowns for all to authenticated
  using (public.has_role('owner', 'office')) with check (public.has_role('owner', 'office'));
create policy "read products" on public.products for select to authenticated using (public.my_role() is not null);
create policy "edit products" on public.products for all to authenticated
  using (public.has_role('owner', 'office')) with check (public.has_role('owner', 'office'));
create policy "read areas" on public.areas for select to authenticated using (public.my_role() is not null);
create policy "edit areas" on public.areas for all to authenticated
  using (public.has_role('owner', 'office')) with check (public.has_role('owner', 'office'));

-- Parties: field staff see only their own parties but may add a new one at the point of sale: assigned to
-- themselves, cash only (no credit limit) and no opening balance, until the owner or office sets those.
create policy "read parties" on public.parties for select to authenticated
  using (public.has_role('owner', 'office', 'godown') or (public.has_role('field') and assigned_to = auth.uid()));
create policy "add parties" on public.parties for insert to authenticated
  with check (
    public.has_role('owner', 'office')
    or (public.has_role('field') and assigned_to = auth.uid() and credit_limit is null and opening_balance = 0)
  );
create policy "edit parties" on public.parties for update to authenticated
  using (public.has_role('owner', 'office')) with check (public.has_role('owner', 'office'));

-- Sales are written only through create_sale / approve_sale; reading follows the party rule.
create policy "read sales" on public.sales for select to authenticated
  using (public.has_role('owner', 'office') or created_by = auth.uid());
create policy "read sale lines" on public.sale_lines for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));

create policy "read receipts" on public.receipts for select to authenticated
  using (public.has_role('owner', 'office') or created_by = auth.uid());
-- Field staff record only money they collected themselves, from their own parties, not dated ahead.
create policy "add receipts" on public.receipts for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.has_role('owner', 'office')
      or (
        public.has_role('field')
        and collected_by = auth.uid()
        and receipt_date <= current_date
        and exists (select 1 from public.parties p where p.id = party_id and p.assigned_to = auth.uid())
      )
    )
  );

create policy "read ledger" on public.ledger_entries for select to authenticated
  using (public.has_role('owner', 'office')
    or exists (select 1 from public.parties p where p.id = party_id and p.assigned_to = auth.uid()));
create policy "read stock" on public.stock_movements for select to authenticated
  using (public.has_role('owner', 'office', 'godown'));

create policy "owner reads audit" on public.audit_log for select to authenticated using (public.has_role('owner'));

-- Functions are callable only by signed-in users; each checks the role itself.
revoke execute on function public.create_sale(jsonb) from public, anon;
revoke execute on function public.approve_sale(uuid, text) from public, anon;
revoke execute on function public.post_sale_entries(uuid) from public, anon, authenticated;
grant execute on function public.create_sale(jsonb) to authenticated;
grant execute on function public.approve_sale(uuid, text) to authenticated;
