create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  name text,
  breed text,
  sex text default 'unknown',
  birth_date date,
  color text,
  microchip_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dogs add column if not exists id uuid;
alter table public.dogs alter column id set default gen_random_uuid();
alter table public.dogs add column if not exists kennel_id uuid;
alter table public.dogs add column if not exists name text;
alter table public.dogs add column if not exists breed text;
alter table public.dogs add column if not exists sex text;
alter table public.dogs add column if not exists birth_date date;
alter table public.dogs add column if not exists color text;
alter table public.dogs add column if not exists microchip_number text;
alter table public.dogs add column if not exists notes text;
alter table public.dogs add column if not exists created_at timestamptz not null default now();
alter table public.dogs add column if not exists updated_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dogs'
      and column_name = 'date_of_birth'
  ) then
    execute 'update public.dogs set birth_date = coalesce(birth_date, date_of_birth) where birth_date is null';
  end if;
end;
$$;

update public.dogs
set sex = 'unknown'
where sex is null;

update public.dogs
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.dogs alter column sex set default 'unknown';
alter table public.dogs alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.dogs'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.dogs where id is null
  ) and not exists (
    select 1
    from public.dogs
    group by id
    having count(*) > 1
  ) then
    alter table public.dogs add constraint dogs_pkey primary key (id);
  end if;

  if not exists (select 1 from public.dogs where kennel_id is null) then
    alter table public.dogs alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.dogs where name is null) then
    alter table public.dogs alter column name set not null;
  end if;

  if not exists (select 1 from public.dogs where sex is null) then
    alter table public.dogs alter column sex set not null;
  end if;

  if not exists (select 1 from public.dogs where updated_at is null) then
    alter table public.dogs alter column updated_at set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dogs_kennel_id_fkey'
      and conrelid = 'public.dogs'::regclass
  ) then
    alter table public.dogs
      add constraint dogs_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dogs_name_check'
      and conrelid = 'public.dogs'::regclass
  ) then
    alter table public.dogs
      add constraint dogs_name_check
      check (name is not null and length(trim(name)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dogs_sex_check'
      and conrelid = 'public.dogs'::regclass
  ) then
    alter table public.dogs
      add constraint dogs_sex_check
      check (sex in ('unknown', 'male', 'female'))
      not valid;
  end if;
end;
$$;

create index if not exists dogs_kennel_id_idx on public.dogs(kennel_id);
create index if not exists dogs_kennel_name_idx on public.dogs(kennel_id, name);

drop trigger if exists set_dogs_updated_at on public.dogs;
create trigger set_dogs_updated_at
before update on public.dogs
for each row execute function public.set_updated_at();

alter table public.dogs enable row level security;

drop policy if exists "Kennel members can read dogs" on public.dogs;
create policy "Kennel members can read dogs"
on public.dogs for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create dogs" on public.dogs;
create policy "Kennel members can create dogs"
on public.dogs for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update dogs" on public.dogs;
create policy "Kennel members can update dogs"
on public.dogs for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete dogs" on public.dogs;
create policy "Kennel owners can delete dogs"
on public.dogs for delete
to authenticated
using (public.is_kennel_owner(kennel_id));
