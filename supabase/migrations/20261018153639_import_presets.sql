create table public.import_presets (
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  headers jsonb not null check (jsonb_typeof(headers) = 'array' and jsonb_array_length(headers) between 4 and 100),
  mapping jsonb not null check (jsonb_typeof(mapping) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);
alter table public.import_presets enable row level security;
revoke all on public.import_presets from public, anon;
grant select, insert, update, delete on public.import_presets to authenticated;
create policy own_presets on public.import_presets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
comment on table public.import_presets is 'Named CSV column mappings only; no invoice rows or email credentials.';
-- Serialize per-owner writes so simultaneous tabs cannot exceed the limit.
create function public.limit_import_presets() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('import-presets:' || new.user_id::text, 0));
  if not exists (select 1 from public.import_presets where user_id = new.user_id and name = new.name)
     and (select count(*) from public.import_presets where user_id = new.user_id) >= 100 then
    raise exception '100 formats maximum par compte' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_import_presets() from public, anon;
create trigger import_presets_limit before insert on public.import_presets
for each row execute function public.limit_import_presets();
