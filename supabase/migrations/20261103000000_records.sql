-- The firm's own records online: one row per list (staff.json, godowns.json, lorries.json…), exactly as the app
-- keeps them in local-data/ on a computer (src/lib/data/store.ts).
--
-- Locked: no one can read or write the table directly, not even with the publishable key. Only the two functions
-- below can, and only with the app's data key (SKA_DATA_SECRET, set on the server and never in the browser); the
-- database keeps only its SHA-256. After running this, set it with:
--   insert into public.ska_data_key (key_sha256) values ('<SHA-256 of SKA_DATA_SECRET, in hex>')
--   on conflict (id) do update set key_sha256 = excluded.key_sha256;

create table public.ska_records (
  name text primary key check (name ~ '^[a-z0-9-]+\.json$'),
  data jsonb not null,
  -- Goes up on every save, across all records, so a server asks only for what changed since it last looked.
  version bigint not null,
  updated_at timestamptz not null default now()
);

create table public.ska_data_key (
  id boolean primary key default true check (id),
  key_sha256 text not null check (key_sha256 ~ '^[0-9a-f]{64}$')
);

create sequence public.ska_record_version;

alter table public.ska_records enable row level security;
alter table public.ska_data_key enable row level security;
revoke all on table public.ska_records, public.ska_data_key from public, anon, authenticated;
revoke all on sequence public.ska_record_version from public, anon, authenticated;

-- Whether p_key is the data key.
create function public.ska_key_ok(p_key text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.ska_data_key
    where key_sha256 = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')
  );
$$;

-- The records saved after version p_since; all of them for 0.
create function public.ska_records_since(p_key text, p_since bigint)
returns table (name text, data jsonb, version bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.ska_key_ok(p_key) then
    raise exception 'wrong data key' using errcode = '28000';
  end if;
  return query select r.name, r.data, r.version from public.ska_records r where r.version > p_since;
end;
$$;

-- Saves records, all or nothing. Each comes as {name, data, base}, base being the version it was read at (0 for a
-- new record). If someone else saved any of them since, nothing is saved and the answer is null, so the app reads
-- the latest and makes its change again; otherwise the answer is each record's new version.
create function public.ska_save_records(p_key text, p_records jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  item jsonb;
  saved jsonb := '{}';
  next_version bigint;
begin
  if not public.ska_key_ok(p_key) then
    raise exception 'wrong data key' using errcode = '28000';
  end if;
  begin
    for item in select value from jsonb_array_elements(p_records) loop
      next_version := nextval('public.ska_record_version');
      if (item->>'base')::bigint = 0 then
        insert into public.ska_records (name, data, version)
        values (item->>'name', item->'data', next_version)
        on conflict on constraint ska_records_pkey do nothing;
      else
        update public.ska_records r
        set data = item->'data', version = next_version, updated_at = now()
        where r.name = item->>'name' and r.version = (item->>'base')::bigint;
      end if;
      if not found then
        raise exception 'saved by someone else' using errcode = '40001';
      end if;
      saved := saved || jsonb_build_object(item->>'name', next_version);
    end loop;
  exception when serialization_failure then
    return null;
  end;
  return saved;
end;
$$;

revoke all on function public.ska_key_ok(text) from public, anon, authenticated;
revoke all on function public.ska_records_since(text, bigint), public.ska_save_records(text, jsonb) from public, authenticated;
grant execute on function public.ska_records_since(text, bigint), public.ska_save_records(text, jsonb) to anon;
