-- Read-only tables for browsing the firm's records in Supabase (Table Editor › schema "ska_view"): one row per staff
-- member, godown, product and so on, read live from public.ska_records, so they always show what the app saved.
-- Views only, so nothing here can be edited; change the records in the app. The ska_view schema isn't on the Data
-- API and the public key's roles get no access to it; the views run with the reader's rights (security_invoker), so
-- only the dashboard (the table's owner) sees anything. Passwords, the Personal PIN and quick notes are left out.

create schema if not exists ska_view;

-- Each entry of one list in one record ("staff.json", "staff"); none when the record or list isn't there.
create or replace function ska_view.items(p_record text, p_key text) returns setof jsonb
language sql stable set search_path = ''
as $$
  select item
  from public.ska_records r,
    jsonb_array_elements(case when jsonb_typeof(r.data -> p_key) = 'array' then r.data -> p_key else '[]'::jsonb end) item
  where r.name = p_record;
$$;

-- The id the app gives a person (src/lib/data/local-data.ts), so attendance and godowns can show names.
create or replace function ska_view.slug(p_text text) returns text
language sql immutable set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace view ska_view.people with (security_invoker = true) as
  select 'u-owner' as id, data -> 'owner' ->> 'name' as name from public.ska_records where name = 'staff.json' and data ? 'owner'
  union all
  select 'u-admin-' || ska_view.slug(a ->> 'name'), a ->> 'name' from ska_view.items('staff.json', 'admins') a
  union all
  select coalesce(s ->> 'replaces', 'u-staff-' || ska_view.slug(s ->> 'name')), s ->> 'name' from ska_view.items('staff.json', 'staff') s;

create or replace view ska_view.staff with (security_invoker = true) as
  select kind, name, designation, role, mobile, godowns, takes_over_from
  from (
    select 1 as sort, 'Owner'::text as kind, data -> 'owner' ->> 'name' as name, data -> 'owner' ->> 'designation' as designation,
      'Admin'::text as role, data -> 'owner' ->> 'mobile' as mobile, null::text as godowns, null::text as takes_over_from
    from public.ska_records where name = 'staff.json' and data ? 'owner'
    union all
    select 2, 'Admin', a ->> 'name', coalesce(a ->> 'designation', 'Admin'), 'Admin', a ->> 'mobile', null, null
    from ska_view.items('staff.json', 'admins') a
    union all
    select 3, 'Staff', s ->> 'name', s ->> 'designation',
      case s ->> 'role' when 'office' then 'Office / accounts' when 'field' then 'Sales & collection'
        when 'godown' then 'Godown in-charge' when 'driver' then 'Driver' else s ->> 'role' end,
      s ->> 'mobile',
      (select string_agg(coalesce(g ->> 'name', gid), ', ')
        from jsonb_array_elements_text(case when jsonb_typeof(s -> 'godowns') = 'array' then s -> 'godowns' else '[]'::jsonb end) gid
        left join ska_view.items('godowns.json', 'godowns') g on g ->> 'id' = gid),
      s ->> 'replaces'
    from ska_view.items('staff.json', 'staff') s
  ) x
  order by sort, name;

create or replace view ska_view.godowns with (security_invoker = true) as
  select g ->> 'id' as id, g ->> 'name' as name, g ->> 'place' as place,
    case when (g ->> 'own')::boolean then 'Own' else 'Rented' end as ownership,
    (select string_agg(s ->> 'name', ', ') from ska_view.items('staff.json', 'staff') s
      where jsonb_typeof(s -> 'godowns') = 'array' and s -> 'godowns' ? (g ->> 'id')) as in_charge
  from ska_view.items('godowns.json', 'godowns') g
  order by name;

create or replace view ska_view.products with (security_invoker = true) as
  select p ->> 'brand' as brand, p ->> 'variant' as type, p ->> 'category' as category,
    case p ->> 'unit' when 'bag' then 'Bag' when 'kg' then 'Kg' else p ->> 'unit' end as sold_by,
    coalesce((p ->> 'active')::boolean, true) as active, p ->> 'id' as id
  from ska_view.items('products.json', 'products') p
  order by category, brand, type;

create or replace view ska_view.suppliers with (security_invoker = true) as
  select s ->> 'name' as name,
    (select string_agg(b, ', ') from jsonb_array_elements_text(case when jsonb_typeof(s -> 'brands') = 'array' then s -> 'brands' else '[]'::jsonb end) b) as brands,
    s ->> 'place' as place, s ->> 'gstin' as gstin, s ->> 'mobile' as mobile, s ->> 'id' as id
  from ska_view.items('suppliers.json', 'suppliers') s
  order by name;

create or replace view ska_view.destinations with (security_invoker = true) as
  select d #>> '{}' as name from ska_view.items('destinations.json', 'destinations') d order by 1;

create or replace view ska_view.rent_drivers with (security_invoker = true) as
  select d #>> '{}' as name from ska_view.items('rent-drivers.json', 'drivers') d order by 1;

create or replace view ska_view.firms with (security_invoker = true) as
  select f ->> 'name' as name, coalesce((f ->> 'primary')::boolean, false) as is_primary, f ->> 'gstin' as gstin,
    f ->> 'phone' as phone, f ->> 'address' as address, f ->> 'id' as id
  from ska_view.items('firms.json', 'firms') f
  order by is_primary desc, name;

create or replace view ska_view.bank_accounts with (security_invoker = true) as
  select a ->> 'name' as name, a ->> 'bank' as bank, a ->> 'accountNo' as account_no, a ->> 'ifsc' as ifsc,
    a ->> 'branch' as branch, f ->> 'name' as firm, (a ->> 'openingBalance')::numeric as opening_balance, a ->> 'id' as id
  from ska_view.items('banks.json', 'accounts') a
  left join ska_view.items('firms.json', 'firms') f on f ->> 'id' = a ->> 'firmId'
  order by firm, name;

create or replace view ska_view.vehicles with (security_invoker = true) as
  select v ->> 'number' as number, v ->> 'kind' as kind, v ->> 'category' as category, v ->> 'model' as model,
    v ->> 'replaces' as takes_over_from
  from ska_view.items('vehicles.json', 'vehicles') v
  order by number;

create or replace view ska_view.parties_added with (security_invoker = true) as
  select c ->> 'name' as name, c ->> 'kind' as kind, c ->> 'place' as place, c ->> 'mobile' as mobile, c ->> 'gstin' as gstin,
    (c ->> 'creditLimit')::numeric as credit_limit, (c ->> 'openingBalance')::numeric as opening_balance, c ->> 'id' as id
  from ska_view.items('customers.json', 'customers') c
  order by name;

create or replace view ska_view.lorries with (security_invoker = true) as
  select (l ->> 'invoiceDate')::date as invoice_date, l ->> 'lorryNo' as lorry_no, l ->> 'companyName' as company,
    l ->> 'invoiceNo' as invoice_no, (l ->> 'invoiceValue')::numeric as invoice_value, l ->> 'driverName' as driver,
    f ->> 'name' as firm, (l -> 'sale' ->> 'updatedOn')::date as sale_updated_on,
    (l -> 'sold' ->> 'on')::date as sold_out_on, (l -> 'sold' ->> 'value')::numeric as sold_for, l ->> 'id' as id
  from ska_view.items('lorries.json', 'lorries') l
  left join ska_view.items('firms.json', 'firms') f on f ->> 'id' = l ->> 'firmId'
  order by invoice_date desc;

create or replace view ska_view.chits with (security_invoker = true) as
  select c ->> 'organiser' as organiser, c ->> 'chitNo' as chit_no, c ->> 'scope' as scope,
    (c ->> 'totalValue')::numeric as total_value, (c ->> 'months')::int as months, (c ->> 'instalment')::numeric as instalment,
    (c ->> 'startDate')::date as start_date, (c ->> 'dueDay')::int as due_day,
    (c ->> 'paidMonths')::int + coalesce(jsonb_array_length(case when jsonb_typeof(c -> 'payments') = 'array' then c -> 'payments' end), 0) as months_paid,
    (c -> 'lifted' ->> 'amount')::numeric as lifted_for, c ->> 'id' as id
  from ska_view.items('chits.json', 'chits') c
  order by start_date;

create or replace view ska_view.rents with (security_invoker = true) as
  select r ->> 'property' as property, case r ->> 'direction' when 'received' then 'Received' else 'Paid' end as direction,
    r ->> 'counterparty' as tenant_or_owner, r ->> 'phone' as phone, (r ->> 'monthlyRent')::numeric as monthly_rent,
    (r ->> 'advance')::numeric as advance, (r ->> 'dueDay')::int as due_day, r ->> 'paidThrough' as paid_through,
    (r ->> 'agreementEnd')::date as agreement_ends, r ->> 'scope' as scope, r ->> 'id' as id
  from ska_view.items('rents.json', 'rents') r
  order by property;

create or replace view ska_view.attendance with (security_invoker = true) as
  select (a ->> 'date')::date as date, coalesce(p.name, a ->> 'profileId') as person, a ->> 'checkIn' as checked_in,
    a ->> 'checkOut' as checked_out
  from ska_view.items('attendance.json', 'records') a
  left join ska_view.people p on p.id = a ->> 'profileId'
  order by date desc, person;

-- Only the dashboard reads these: nothing for the Data API's roles.
revoke all on schema ska_view from public, anon, authenticated;
revoke all on all tables in schema ska_view from public, anon, authenticated;
revoke all on all functions in schema ska_view from public, anon, authenticated;
