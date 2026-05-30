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

-- Keep workspace helpers in the final shape expected by the app. These are
-- idempotent copies of the later workspace migration because the remote will
-- repair those historical versions before this reconciliation runs.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

update public.profiles
set email = auth.users.email
from auth.users
where public.profiles.id = auth.users.id
  and public.profiles.email is null;

alter table public.kennels add column if not exists created_by uuid;
alter table public.kennels add column if not exists created_at timestamptz not null default now();
alter table public.kennels add column if not exists updated_at timestamptz not null default now();
alter table public.kennel_members add column if not exists profile_id uuid;
alter table public.kennel_members add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'kennel_members'
      and column_name = 'user_id'
  ) then
    execute 'update public.kennel_members set profile_id = user_id where profile_id is null';
  end if;
end;
$$;

insert into public.profiles (id, email)
select distinct kennel_members.profile_id, auth.users.email
from public.kennel_members
left join public.profiles on profiles.id = kennel_members.profile_id
left join auth.users on auth.users.id = kennel_members.profile_id
where kennel_members.profile_id is not null
  and profiles.id is null
on conflict (id) do nothing;

update public.kennels
set created_by = owner_members.profile_id
from (
  select distinct on (kennel_id) kennel_id, profile_id
  from public.kennel_members
  where profile_id is not null
  order by kennel_id, (role = 'owner') desc, created_at asc
) as owner_members
where kennels.id = owner_members.kennel_id
  and kennels.created_by is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kennels_created_by_fkey'
      and conrelid = 'public.kennels'::regclass
  ) then
    alter table public.kennels
      add constraint kennels_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'kennel_members_profile_id_fkey'
      and conrelid = 'public.kennel_members'::regclass
  ) then
    alter table public.kennel_members
      add constraint kennel_members_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from public.kennel_members
    where profile_id is null
  ) then
    alter table public.kennel_members alter column profile_id set not null;
  end if;
end;
$$;

create index if not exists kennels_created_by_idx on public.kennels(created_by);
create index if not exists kennel_members_kennel_id_idx on public.kennel_members(kennel_id);
create index if not exists kennel_members_profile_id_idx on public.kennel_members(profile_id);

do $$
begin
  if to_regclass('public.kennel_members_kennel_id_profile_id_idx') is null then
    if not exists (
      select 1
      from public.kennel_members
      where profile_id is not null
      group by kennel_id, profile_id
      having count(*) > 1
    ) then
      create unique index kennel_members_kennel_id_profile_id_idx
        on public.kennel_members(kennel_id, profile_id)
        where profile_id is not null;
    else
      raise notice 'Skipped kennel_members_kennel_id_profile_id_idx because duplicate memberships exist.';
    end if;
  end if;
end;
$$;

create or replace function public.is_kennel_member(target_kennel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kennel_members
    where kennel_members.kennel_id = target_kennel_id
      and kennel_members.profile_id = auth.uid()
  );
$$;

create or replace function public.is_kennel_owner(target_kennel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kennel_members
    where kennel_members.kennel_id = target_kennel_id
      and kennel_members.profile_id = auth.uid()
      and kennel_members.role = 'owner'
  );
$$;

create or replace function public.create_kennel(kennel_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_kennel_id uuid;
  normalized_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  normalized_name := nullif(trim(kennel_name), '');

  if normalized_name is null or length(normalized_name) < 2 then
    raise exception 'Kennel name is required';
  end if;

  insert into public.profiles (id, email)
  values (
    auth.uid(),
    (select users.email from auth.users as users where users.id = auth.uid())
  )
  on conflict (id) do update
  set email = coalesce(profiles.email, excluded.email);

  insert into public.kennels (name, created_by)
  values (normalized_name, auth.uid())
  returning id into new_kennel_id;

  insert into public.kennel_members (kennel_id, profile_id, role)
  values (new_kennel_id, auth.uid(), 'owner');

  return new_kennel_id;
end;
$$;

grant execute on function public.create_kennel(text) to authenticated;
grant execute on function public.is_kennel_member(uuid) to authenticated;
grant execute on function public.is_kennel_owner(uuid) to authenticated;

-- Litters: remote drift had date_of_birth and missed status/birth_date/updated_at.
create table if not exists public.litters (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  name text,
  mother_id uuid references public.dogs(id) on delete set null,
  father_id uuid references public.dogs(id) on delete set null,
  birth_date date,
  expected_birth_date date,
  status text default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.litters alter column id set default gen_random_uuid();
alter table public.litters add column if not exists kennel_id uuid;
alter table public.litters add column if not exists name text;
alter table public.litters add column if not exists mother_id uuid;
alter table public.litters add column if not exists father_id uuid;
alter table public.litters add column if not exists birth_date date;
alter table public.litters add column if not exists expected_birth_date date;
alter table public.litters add column if not exists status text;
alter table public.litters add column if not exists notes text;
alter table public.litters add column if not exists created_at timestamptz not null default now();
alter table public.litters add column if not exists updated_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'litters'
      and column_name = 'date_of_birth'
  ) then
    execute 'update public.litters set birth_date = coalesce(birth_date, date_of_birth) where birth_date is null';
  end if;
end;
$$;

update public.litters
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.litters
set status = case
  when birth_date is not null then 'born'
  when expected_birth_date is not null then 'expected'
  else 'planned'
end
where status is null;

alter table public.litters alter column status set default 'planned';
alter table public.litters alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.litters'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.litters where id is null
  ) and not exists (
    select 1
    from public.litters
    group by id
    having count(*) > 1
  ) then
    alter table public.litters add constraint litters_pkey primary key (id);
  end if;

  if not exists (select 1 from public.litters where status is null) then
    alter table public.litters alter column status set not null;
  end if;

  if not exists (select 1 from public.litters where updated_at is null) then
    alter table public.litters alter column updated_at set not null;
  end if;

  if not exists (select 1 from public.litters where kennel_id is null) then
    alter table public.litters alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.litters where name is null) then
    alter table public.litters alter column name set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'litters_kennel_id_fkey'
      and conrelid = 'public.litters'::regclass
  ) then
    alter table public.litters
      add constraint litters_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'litters_mother_id_fkey'
      and conrelid = 'public.litters'::regclass
  ) then
    alter table public.litters
      add constraint litters_mother_id_fkey
      foreign key (mother_id) references public.dogs(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'litters_father_id_fkey'
      and conrelid = 'public.litters'::regclass
  ) then
    alter table public.litters
      add constraint litters_father_id_fkey
      foreign key (father_id) references public.dogs(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'litters_name_check'
      and conrelid = 'public.litters'::regclass
  ) then
    alter table public.litters
      add constraint litters_name_check
      check (name is not null and length(trim(name)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'litters_status_check'
      and conrelid = 'public.litters'::regclass
  ) then
    alter table public.litters
      add constraint litters_status_check
      check (status in ('planned', 'expected', 'born', 'archived'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'litters_distinct_parents'
      and conrelid = 'public.litters'::regclass
  ) then
    alter table public.litters
      add constraint litters_distinct_parents
      check (mother_id is null or father_id is null or mother_id <> father_id)
      not valid;
  end if;
end;
$$;

create index if not exists litters_kennel_id_idx on public.litters(kennel_id);
create index if not exists litters_kennel_status_idx on public.litters(kennel_id, status);
create index if not exists litters_mother_id_idx on public.litters(mother_id);
create index if not exists litters_father_id_idx on public.litters(father_id);

create or replace function public.ensure_litter_parents_belong_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mother_id is not null and not exists (
    select 1
    from public.dogs
    where dogs.id = new.mother_id
      and dogs.kennel_id = new.kennel_id
  ) then
    raise exception 'Mother must belong to the litter kennel';
  end if;

  if new.father_id is not null and not exists (
    select 1
    from public.dogs
    where dogs.id = new.father_id
      and dogs.kennel_id = new.kennel_id
  ) then
    raise exception 'Father must belong to the litter kennel';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_litter_parents_belong_to_kennel on public.litters;
create trigger ensure_litter_parents_belong_to_kennel
before insert or update on public.litters
for each row execute function public.ensure_litter_parents_belong_to_kennel();

drop trigger if exists set_litters_updated_at on public.litters;
create trigger set_litters_updated_at
before update on public.litters
for each row execute function public.set_updated_at();

-- Clients.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients alter column id set default gen_random_uuid();
alter table public.clients add column if not exists kennel_id uuid;
alter table public.clients add column if not exists first_name text;
alter table public.clients add column if not exists last_name text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists phone text;
alter table public.clients add column if not exists address text;
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists country text;
alter table public.clients add column if not exists notes text;
alter table public.clients add column if not exists created_at timestamptz not null default now();
alter table public.clients add column if not exists updated_at timestamptz;

update public.clients
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.clients alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clients'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.clients where id is null
  ) and not exists (
    select 1
    from public.clients
    group by id
    having count(*) > 1
  ) then
    alter table public.clients add constraint clients_pkey primary key (id);
  end if;

  if not exists (select 1 from public.clients where updated_at is null) then
    alter table public.clients alter column updated_at set not null;
  end if;

  if not exists (select 1 from public.clients where kennel_id is null) then
    alter table public.clients alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.clients where first_name is null) then
    alter table public.clients alter column first_name set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_kennel_id_fkey'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_first_name_check'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_first_name_check
      check (first_name is not null and length(trim(first_name)) >= 1)
      not valid;
  end if;
end;
$$;

create index if not exists clients_kennel_id_idx on public.clients(kennel_id);
create index if not exists clients_kennel_name_idx on public.clients(kennel_id, first_name, last_name);
create index if not exists clients_kennel_email_idx on public.clients(kennel_id, email);
create index if not exists clients_kennel_phone_idx on public.clients(kennel_id, phone);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- Puppies in the final CRUD shape.
create table if not exists public.puppies (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  litter_id uuid references public.litters(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text,
  sex text default 'unknown',
  color text,
  birth_date date,
  birth_weight numeric(8, 2),
  photo_url text,
  status text default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.puppies alter column id set default gen_random_uuid();
alter table public.puppies add column if not exists kennel_id uuid;
alter table public.puppies add column if not exists litter_id uuid;
alter table public.puppies add column if not exists client_id uuid;
alter table public.puppies add column if not exists name text;
alter table public.puppies add column if not exists sex text;
alter table public.puppies add column if not exists color text;
alter table public.puppies add column if not exists birth_date date;
alter table public.puppies add column if not exists birth_weight numeric(8, 2);
alter table public.puppies add column if not exists photo_url text;
alter table public.puppies add column if not exists status text;
alter table public.puppies add column if not exists notes text;
alter table public.puppies add column if not exists created_at timestamptz not null default now();
alter table public.puppies add column if not exists updated_at timestamptz;

update public.puppies
set status = case status
  when 'placed' then 'sold'
  when 'kept' then 'keeper'
  else status
end
where status in ('placed', 'kept');

update public.puppies
set status = 'available'
where status is null;

update public.puppies
set sex = 'unknown'
where sex is null;

update public.puppies
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.puppies alter column status set default 'available';
alter table public.puppies alter column sex set default 'unknown';
alter table public.puppies alter column updated_at set default now();

alter table public.puppies drop constraint if exists puppies_status_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.puppies'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.puppies where id is null
  ) and not exists (
    select 1
    from public.puppies
    group by id
    having count(*) > 1
  ) then
    alter table public.puppies add constraint puppies_pkey primary key (id);
  end if;

  if not exists (select 1 from public.puppies where kennel_id is null) then
    alter table public.puppies alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.puppies where litter_id is null) then
    alter table public.puppies alter column litter_id set not null;
  end if;

  if not exists (select 1 from public.puppies where name is null) then
    alter table public.puppies alter column name set not null;
  end if;

  if not exists (select 1 from public.puppies where sex is null) then
    alter table public.puppies alter column sex set not null;
  end if;

  if not exists (select 1 from public.puppies where status is null) then
    alter table public.puppies alter column status set not null;
  end if;

  if not exists (select 1 from public.puppies where updated_at is null) then
    alter table public.puppies alter column updated_at set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'puppies_kennel_id_fkey'
      and conrelid = 'public.puppies'::regclass
  ) then
    alter table public.puppies
      add constraint puppies_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'puppies_litter_id_fkey'
      and conrelid = 'public.puppies'::regclass
  ) then
    alter table public.puppies
      add constraint puppies_litter_id_fkey
      foreign key (litter_id) references public.litters(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'puppies_client_id_fkey'
      and conrelid = 'public.puppies'::regclass
  ) then
    alter table public.puppies
      add constraint puppies_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'puppies_name_check'
      and conrelid = 'public.puppies'::regclass
  ) then
    alter table public.puppies
      add constraint puppies_name_check
      check (name is not null and length(trim(name)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'puppies_sex_check'
      and conrelid = 'public.puppies'::regclass
  ) then
    alter table public.puppies
      add constraint puppies_sex_check
      check (sex in ('unknown', 'male', 'female'))
      not valid;
  end if;

  alter table public.puppies
    add constraint puppies_status_check
    check (status in ('available', 'reserved', 'sold', 'keeper', 'deceased'))
    not valid;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'puppies_birth_weight_check'
      and conrelid = 'public.puppies'::regclass
  ) then
    alter table public.puppies
      add constraint puppies_birth_weight_check
      check (birth_weight is null or birth_weight >= 0)
      not valid;
  end if;
end;
$$;

create index if not exists puppies_kennel_id_idx on public.puppies(kennel_id);
create index if not exists puppies_litter_id_idx on public.puppies(litter_id);
create index if not exists puppies_kennel_litter_idx on public.puppies(kennel_id, litter_id);
create index if not exists puppies_kennel_status_idx on public.puppies(kennel_id, status);
create index if not exists puppies_client_id_idx on public.puppies(client_id);

create or replace function public.ensure_puppy_litter_belongs_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.litters
    where litters.id = new.litter_id
      and litters.kennel_id = new.kennel_id
  ) then
    raise exception 'Litter must belong to the puppy kennel';
  end if;

  if new.client_id is not null and not exists (
    select 1
    from public.clients
    where clients.id = new.client_id
      and clients.kennel_id = new.kennel_id
  ) then
    raise exception 'Client must belong to the puppy kennel';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_puppy_litter_belongs_to_kennel on public.puppies;
create trigger ensure_puppy_litter_belongs_to_kennel
before insert or update on public.puppies
for each row execute function public.ensure_puppy_litter_belongs_to_kennel();

drop trigger if exists set_puppies_updated_at on public.puppies;
create trigger set_puppies_updated_at
before update on public.puppies
for each row execute function public.set_updated_at();

-- Reservations in the main schema. Legacy columns are preserved if they exist;
-- compatible values are copied into main columns before constraints are enforced.
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  puppy_id uuid references public.puppies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  litter_id uuid references public.litters(id) on delete set null,
  status text default 'pending',
  reserved_price numeric(12, 2),
  reservation_date date default current_date,
  deposit_amount numeric(12, 2),
  deposit_paid boolean default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservations alter column id set default gen_random_uuid();
alter table public.reservations add column if not exists kennel_id uuid;
alter table public.reservations add column if not exists puppy_id uuid;
alter table public.reservations add column if not exists client_id uuid;
alter table public.reservations add column if not exists litter_id uuid;
alter table public.reservations add column if not exists status text;
alter table public.reservations add column if not exists reserved_price numeric(12, 2);
alter table public.reservations add column if not exists reservation_date date;
alter table public.reservations add column if not exists deposit_amount numeric(12, 2);
alter table public.reservations add column if not exists deposit_paid boolean;
alter table public.reservations add column if not exists notes text;
alter table public.reservations add column if not exists created_at timestamptz not null default now();
alter table public.reservations add column if not exists updated_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'final_price'
  ) then
    execute 'update public.reservations set reserved_price = coalesce(reserved_price, final_price) where reserved_price is null';
  end if;
end;
$$;

update public.reservations
set status = 'pending'
where status is null;

update public.reservations
set deposit_paid = false
where deposit_paid is null;

update public.reservations
set reservation_date = current_date
where reservation_date is null;

update public.reservations
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.reservations alter column status set default 'pending';
alter table public.reservations alter column reservation_date set default current_date;
alter table public.reservations alter column deposit_paid set default false;
alter table public.reservations alter column updated_at set default now();
alter table public.reservations drop constraint if exists reservations_status_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.reservations where id is null
  ) and not exists (
    select 1
    from public.reservations
    group by id
    having count(*) > 1
  ) then
    alter table public.reservations add constraint reservations_pkey primary key (id);
  end if;

  if not exists (select 1 from public.reservations where kennel_id is null) then
    alter table public.reservations alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.reservations where puppy_id is null) then
    alter table public.reservations alter column puppy_id set not null;
  end if;

  if not exists (select 1 from public.reservations where client_id is null) then
    alter table public.reservations alter column client_id set not null;
  end if;

  if not exists (select 1 from public.reservations where status is null) then
    alter table public.reservations alter column status set not null;
  end if;

  if not exists (select 1 from public.reservations where reservation_date is null) then
    alter table public.reservations alter column reservation_date set not null;
  end if;

  if not exists (select 1 from public.reservations where deposit_paid is null) then
    alter table public.reservations alter column deposit_paid set not null;
  end if;

  if not exists (select 1 from public.reservations where updated_at is null) then
    alter table public.reservations alter column updated_at set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_kennel_id_fkey'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_puppy_id_fkey'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_puppy_id_fkey
      foreign key (puppy_id) references public.puppies(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_client_id_fkey'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_litter_id_fkey'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_litter_id_fkey
      foreign key (litter_id) references public.litters(id) on delete set null
      not valid;
  end if;

  alter table public.reservations
    add constraint reservations_status_check
    check (status in ('pending', 'reserved', 'paid', 'cancelled', 'completed'))
    not valid;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_deposit_amount_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_deposit_amount_check
      check (deposit_amount is null or deposit_amount >= 0)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_reserved_price_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_reserved_price_check
      check (reserved_price is null or reserved_price >= 0)
      not valid;
  end if;
end;
$$;

create index if not exists reservations_kennel_id_idx on public.reservations(kennel_id);
create index if not exists reservations_puppy_id_idx on public.reservations(puppy_id);
create index if not exists reservations_client_id_idx on public.reservations(client_id);
create index if not exists reservations_litter_id_idx on public.reservations(litter_id);
create index if not exists reservations_kennel_status_idx on public.reservations(kennel_id, status);
create index if not exists reservations_kennel_date_idx on public.reservations(kennel_id, reservation_date);

do $$
begin
  if to_regclass('public.reservations_active_puppy_idx') is null then
    if not exists (
      select 1
      from public.reservations
      where status in ('pending', 'reserved', 'paid')
      group by puppy_id
      having count(*) > 1
    ) then
      create unique index reservations_active_puppy_idx
        on public.reservations(puppy_id)
        where status in ('pending', 'reserved', 'paid');
    else
      raise notice 'Skipped reservations_active_puppy_idx because duplicate active reservations exist.';
    end if;
  end if;
end;
$$;

create or replace function public.ensure_reservation_relations_belong_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  puppy_kennel_id uuid;
  puppy_litter_id uuid;
begin
  select puppies.kennel_id, puppies.litter_id
    into puppy_kennel_id, puppy_litter_id
  from public.puppies
  where puppies.id = new.puppy_id;

  if puppy_kennel_id is null or puppy_kennel_id <> new.kennel_id then
    raise exception 'Puppy must belong to the reservation kennel';
  end if;

  if not exists (
    select 1
    from public.clients
    where clients.id = new.client_id
      and clients.kennel_id = new.kennel_id
  ) then
    raise exception 'Client must belong to the reservation kennel';
  end if;

  new.litter_id := puppy_litter_id;

  return new;
end;
$$;

drop trigger if exists ensure_reservation_relations_belong_to_kennel on public.reservations;
create trigger ensure_reservation_relations_belong_to_kennel
before insert or update on public.reservations
for each row execute function public.ensure_reservation_relations_belong_to_kennel();

drop trigger if exists set_reservations_updated_at on public.reservations;
create trigger set_reservations_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

-- Documents and storage policies.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  title text,
  document_type text default 'other',
  file_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents alter column id set default gen_random_uuid();
alter table public.documents add column if not exists kennel_id uuid;
alter table public.documents add column if not exists entity_type text;
alter table public.documents add column if not exists entity_id uuid;
alter table public.documents add column if not exists title text;
alter table public.documents add column if not exists document_type text;
alter table public.documents add column if not exists file_path text;
alter table public.documents add column if not exists file_name text;
alter table public.documents add column if not exists mime_type text;
alter table public.documents add column if not exists size_bytes bigint;
alter table public.documents add column if not exists notes text;
alter table public.documents add column if not exists created_at timestamptz not null default now();
alter table public.documents add column if not exists updated_at timestamptz;

update public.documents
set document_type = 'other'
where document_type is null;

update public.documents
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.documents alter column document_type set default 'other';
alter table public.documents alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.documents'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.documents where id is null
  ) and not exists (
    select 1
    from public.documents
    group by id
    having count(*) > 1
  ) then
    alter table public.documents add constraint documents_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_kennel_id_fkey'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (select 1 from public.documents where kennel_id is null) then
    alter table public.documents alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.documents where entity_type is null) then
    alter table public.documents alter column entity_type set not null;
  end if;

  if not exists (select 1 from public.documents where entity_id is null) then
    alter table public.documents alter column entity_id set not null;
  end if;

  if not exists (select 1 from public.documents where title is null) then
    alter table public.documents alter column title set not null;
  end if;

  if not exists (select 1 from public.documents where document_type is null) then
    alter table public.documents alter column document_type set not null;
  end if;

  if not exists (select 1 from public.documents where file_path is null) then
    alter table public.documents alter column file_path set not null;
  end if;

  if not exists (select 1 from public.documents where file_name is null) then
    alter table public.documents alter column file_name set not null;
  end if;

  if not exists (select 1 from public.documents where mime_type is null) then
    alter table public.documents alter column mime_type set not null;
  end if;

  if not exists (select 1 from public.documents where size_bytes is null) then
    alter table public.documents alter column size_bytes set not null;
  end if;

  if not exists (select 1 from public.documents where updated_at is null) then
    alter table public.documents alter column updated_at set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_entity_type_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_entity_type_check
      check (entity_type in ('dog', 'puppy', 'litter', 'client'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_title_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_title_check
      check (title is not null and length(trim(title)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_document_type_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_document_type_check
      check (
        document_type in (
          'genetic_analysis',
          'pedigree',
          'contract',
          'vaccine_record',
          'veterinary_report',
          'recommendation',
          'other'
        )
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_size_bytes_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_size_bytes_check
      check (size_bytes is null or size_bytes >= 0)
      not valid;
  end if;
end;
$$;

create index if not exists documents_kennel_id_idx on public.documents(kennel_id);
create index if not exists documents_entity_idx on public.documents(kennel_id, entity_type, entity_id);
create index if not exists documents_type_idx on public.documents(kennel_id, document_type);

do $$
begin
  if to_regclass('public.documents_file_path_idx') is null then
    if not exists (
      select 1
      from public.documents
      where file_path is not null
      group by file_path
      having count(*) > 1
    ) then
      create unique index documents_file_path_idx on public.documents(file_path);
    else
      raise notice 'Skipped documents_file_path_idx because duplicate file paths exist.';
    end if;
  end if;
end;
$$;

create or replace function public.ensure_document_entity_belongs_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.entity_type = 'dog' then
    if not exists (
      select 1 from public.dogs where dogs.id = new.entity_id and dogs.kennel_id = new.kennel_id
    ) then
      raise exception 'Dog must belong to the document kennel';
    end if;
  elsif new.entity_type = 'puppy' then
    if not exists (
      select 1 from public.puppies where puppies.id = new.entity_id and puppies.kennel_id = new.kennel_id
    ) then
      raise exception 'Puppy must belong to the document kennel';
    end if;
  elsif new.entity_type = 'litter' then
    if not exists (
      select 1 from public.litters where litters.id = new.entity_id and litters.kennel_id = new.kennel_id
    ) then
      raise exception 'Litter must belong to the document kennel';
    end if;
  elsif new.entity_type = 'client' then
    if not exists (
      select 1 from public.clients where clients.id = new.entity_id and clients.kennel_id = new.kennel_id
    ) then
      raise exception 'Client must belong to the document kennel';
    end if;
  else
    raise exception 'Unsupported document entity type';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_document_entity_belongs_to_kennel on public.documents;
create trigger ensure_document_entity_belongs_to_kennel
before insert or update on public.documents
for each row execute function public.ensure_document_entity_belongs_to_kennel();

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create or replace function public.storage_path_kennel_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  kennel_id_text text;
begin
  if split_part(object_name, '/', 1) <> 'kennels' then
    return null;
  end if;

  kennel_id_text := split_part(object_name, '/', 2);

  if kennel_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;

  return kennel_id_text::uuid;
end;
$$;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public)
      values ('documents', 'documents', false)
      on conflict (id) do update
      set public = false
    $sql$;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Kennel members can read document files" on storage.objects';
    execute 'create policy "Kennel members can read document files" on storage.objects for select to authenticated using (bucket_id = ''documents'' and public.is_kennel_member(public.storage_path_kennel_id(name)))';

    execute 'drop policy if exists "Kennel members can upload document files" on storage.objects';
    execute 'create policy "Kennel members can upload document files" on storage.objects for insert to authenticated with check (bucket_id = ''documents'' and public.is_kennel_member(public.storage_path_kennel_id(name)) and split_part(name, ''/'', 1) = ''kennels'' and split_part(name, ''/'', 3) in (''dog'', ''puppy'', ''litter'', ''client''))';

    execute 'drop policy if exists "Kennel members can update document files" on storage.objects';
    execute 'create policy "Kennel members can update document files" on storage.objects for update to authenticated using (bucket_id = ''documents'' and public.is_kennel_member(public.storage_path_kennel_id(name))) with check (bucket_id = ''documents'' and public.is_kennel_member(public.storage_path_kennel_id(name)) and split_part(name, ''/'', 1) = ''kennels'' and split_part(name, ''/'', 3) in (''dog'', ''puppy'', ''litter'', ''client''))';

    execute 'drop policy if exists "Kennel owners can delete document files" on storage.objects';
    execute 'create policy "Kennel owners can delete document files" on storage.objects for delete to authenticated using (bucket_id = ''documents'' and public.is_kennel_owner(public.storage_path_kennel_id(name)))';
  end if;
end;
$$;

-- Promotions, notifications, and push tokens.
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  title text,
  message text,
  image_url text,
  action_url text,
  promotion_type text default 'other',
  is_global boolean not null default false,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotions alter column id set default gen_random_uuid();
alter table public.promotions add column if not exists kennel_id uuid;
alter table public.promotions add column if not exists title text;
alter table public.promotions add column if not exists message text;
alter table public.promotions add column if not exists image_url text;
alter table public.promotions add column if not exists action_url text;
alter table public.promotions add column if not exists promotion_type text;
alter table public.promotions add column if not exists is_global boolean;
alter table public.promotions add column if not exists created_by uuid;
alter table public.promotions add column if not exists created_at timestamptz not null default now();
alter table public.promotions add column if not exists updated_at timestamptz;

update public.promotions set promotion_type = 'other' where promotion_type is null;
update public.promotions set is_global = false where is_global is null;
update public.promotions set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;

alter table public.promotions alter column promotion_type set default 'other';
alter table public.promotions alter column is_global set default false;
alter table public.promotions alter column updated_at set default now();
alter table public.promotions alter column created_by set default auth.uid();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.promotions'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.promotions where id is null
  ) and not exists (
    select 1
    from public.promotions
    group by id
    having count(*) > 1
  ) then
    alter table public.promotions add constraint promotions_pkey primary key (id);
  end if;

  if not exists (select 1 from public.promotions where is_global is null) then
    alter table public.promotions alter column is_global set not null;
  end if;

  if not exists (select 1 from public.promotions where promotion_type is null) then
    alter table public.promotions alter column promotion_type set not null;
  end if;

  if not exists (select 1 from public.promotions where updated_at is null) then
    alter table public.promotions alter column updated_at set not null;
  end if;

  if not exists (select 1 from public.promotions where title is null) then
    alter table public.promotions alter column title set not null;
  end if;

  if not exists (select 1 from public.promotions where message is null) then
    alter table public.promotions alter column message set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'promotions_kennel_id_fkey'
      and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions
      add constraint promotions_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'promotions_created_by_fkey'
      and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions
      add constraint promotions_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'promotions_title_check'
      and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions
      add constraint promotions_title_check
      check (title is not null and length(trim(title)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'promotions_message_check'
      and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions
      add constraint promotions_message_check
      check (message is not null and length(trim(message)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'promotions_promotion_type_check'
      and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions
      add constraint promotions_promotion_type_check
      check (
        promotion_type in (
          'veterinary',
          'nutrition',
          'genetics',
          'supplements',
          'grooming',
          'kennel',
          'puppies',
          'other'
        )
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'promotions_global_or_kennel_check'
      and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions
      add constraint promotions_global_or_kennel_check
      check (
        (is_global = true and kennel_id is null)
        or (is_global = false and kennel_id is not null)
      )
      not valid;
  end if;
end;
$$;

create index if not exists promotions_kennel_id_idx on public.promotions(kennel_id);
create index if not exists promotions_type_idx on public.promotions(promotion_type);
create index if not exists promotions_created_at_idx on public.promotions(created_at);
create index if not exists promotions_global_idx on public.promotions(is_global);

drop trigger if exists set_promotions_updated_at on public.promotions;
create trigger set_promotions_updated_at
before update on public.promotions
for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  promotion_id uuid references public.promotions(id) on delete set null,
  title text,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications alter column id set default gen_random_uuid();
alter table public.notifications add column if not exists kennel_id uuid;
alter table public.notifications add column if not exists client_id uuid;
alter table public.notifications add column if not exists promotion_id uuid;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.notifications where id is null
  ) and not exists (
    select 1
    from public.notifications
    group by id
    having count(*) > 1
  ) then
    alter table public.notifications add constraint notifications_pkey primary key (id);
  end if;

  if not exists (select 1 from public.notifications where kennel_id is null) then
    alter table public.notifications alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.notifications where title is null) then
    alter table public.notifications alter column title set not null;
  end if;

  if not exists (select 1 from public.notifications where body is null) then
    alter table public.notifications alter column body set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_kennel_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_client_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_promotion_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_promotion_id_fkey
      foreign key (promotion_id) references public.promotions(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_title_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_title_check
      check (title is not null and length(trim(title)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_body_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_body_check
      check (body is not null and length(trim(body)) >= 1)
      not valid;
  end if;
end;
$$;

create index if not exists notifications_kennel_id_idx on public.notifications(kennel_id);
create index if not exists notifications_client_id_idx on public.notifications(client_id);
create index if not exists notifications_promotion_id_idx on public.notifications(promotion_id);
create index if not exists notifications_unread_idx on public.notifications(kennel_id, read_at);
create index if not exists notifications_created_at_idx on public.notifications(kennel_id, created_at);

create or replace function public.ensure_notification_relations_belong_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  promotion_kennel_id uuid;
  promotion_is_global boolean;
begin
  if new.client_id is not null and not exists (
    select 1
    from public.clients
    where clients.id = new.client_id
      and clients.kennel_id = new.kennel_id
  ) then
    raise exception 'Client must belong to the notification kennel';
  end if;

  if new.promotion_id is not null then
    select promotions.kennel_id, promotions.is_global
      into promotion_kennel_id, promotion_is_global
    from public.promotions
    where promotions.id = new.promotion_id;

    if promotion_is_global is null then
      raise exception 'Promotion must exist for the notification';
    end if;

    if promotion_is_global = false and promotion_kennel_id <> new.kennel_id then
      raise exception 'Promotion must belong to the notification kennel';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_notification_relations_belong_to_kennel on public.notifications;
create trigger ensure_notification_relations_belong_to_kennel
before insert or update on public.notifications
for each row execute function public.ensure_notification_relations_belong_to_kennel();

create or replace function public.create_notification_for_kennel_promotion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_global = false and new.kennel_id is not null then
    insert into public.notifications (kennel_id, promotion_id, title, body)
    values (new.kennel_id, new.id, new.title, new.message);
  end if;

  return new;
end;
$$;

drop trigger if exists create_notification_for_kennel_promotion on public.promotions;
create trigger create_notification_for_kennel_promotion
after insert on public.promotions
for each row execute function public.create_notification_for_kennel_promotion();

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  kennel_id uuid references public.kennels(id) on delete cascade,
  expo_push_token text,
  platform text default 'unknown',
  created_at timestamptz not null default now()
);

alter table public.push_tokens alter column id set default gen_random_uuid();
alter table public.push_tokens add column if not exists user_id uuid;
alter table public.push_tokens add column if not exists kennel_id uuid;
alter table public.push_tokens add column if not exists expo_push_token text;
alter table public.push_tokens add column if not exists platform text;
alter table public.push_tokens add column if not exists created_at timestamptz not null default now();

update public.push_tokens set platform = 'unknown' where platform is null;
alter table public.push_tokens alter column platform set default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.push_tokens'::regclass
      and contype = 'p'
  ) and not exists (
    select 1 from public.push_tokens where id is null
  ) and not exists (
    select 1
    from public.push_tokens
    group by id
    having count(*) > 1
  ) then
    alter table public.push_tokens add constraint push_tokens_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_tokens_user_id_fkey'
      and conrelid = 'public.push_tokens'::regclass
  ) then
    alter table public.push_tokens
      add constraint push_tokens_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_tokens_kennel_id_fkey'
      and conrelid = 'public.push_tokens'::regclass
  ) then
    alter table public.push_tokens
      add constraint push_tokens_kennel_id_fkey
      foreign key (kennel_id) references public.kennels(id) on delete cascade
      not valid;
  end if;

  if not exists (select 1 from public.push_tokens where user_id is null) then
    alter table public.push_tokens alter column user_id set not null;
  end if;

  if not exists (select 1 from public.push_tokens where kennel_id is null) then
    alter table public.push_tokens alter column kennel_id set not null;
  end if;

  if not exists (select 1 from public.push_tokens where expo_push_token is null) then
    alter table public.push_tokens alter column expo_push_token set not null;
  end if;

  if not exists (select 1 from public.push_tokens where platform is null) then
    alter table public.push_tokens alter column platform set not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_tokens_expo_push_token_check'
      and conrelid = 'public.push_tokens'::regclass
  ) then
    alter table public.push_tokens
      add constraint push_tokens_expo_push_token_check
      check (expo_push_token is not null and length(trim(expo_push_token)) >= 1)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_tokens_platform_check'
      and conrelid = 'public.push_tokens'::regclass
  ) then
    alter table public.push_tokens
      add constraint push_tokens_platform_check
      check (platform in ('ios', 'android', 'web', 'windows', 'macos', 'unknown'))
      not valid;
  end if;
end;
$$;

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);
create index if not exists push_tokens_kennel_id_idx on public.push_tokens(kennel_id);
create index if not exists push_tokens_expo_push_token_idx on public.push_tokens(expo_push_token);

do $$
begin
  if to_regclass('public.push_tokens_user_id_kennel_id_expo_push_token_key') is null then
    if not exists (
      select 1
      from public.push_tokens
      group by user_id, kennel_id, expo_push_token
      having count(*) > 1
    ) then
      alter table public.push_tokens
        add constraint push_tokens_user_id_kennel_id_expo_push_token_key
        unique (user_id, kennel_id, expo_push_token);
    else
      raise notice 'Skipped push_tokens unique constraint because duplicate tokens exist.';
    end if;
  end if;
end;
$$;

-- RLS policies.
alter table public.profiles enable row level security;
alter table public.kennels enable row level security;
alter table public.kennel_members enable row level security;
alter table public.litters enable row level security;
alter table public.clients enable row level security;
alter table public.puppies enable row level security;
alter table public.reservations enable row level security;
alter table public.documents enable row level security;
alter table public.promotions enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Kennel members can read kennels" on public.kennels;
create policy "Kennel members can read kennels"
on public.kennels for select
to authenticated
using (public.is_kennel_member(id));

drop policy if exists "Kennel owners can update kennels" on public.kennels;
create policy "Kennel owners can update kennels"
on public.kennels for update
to authenticated
using (public.is_kennel_owner(id))
with check (public.is_kennel_owner(id));

drop policy if exists "Kennel members can read members" on public.kennel_members;
create policy "Kennel members can read members"
on public.kennel_members for select
to authenticated
using (profile_id = auth.uid() or public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can add members" on public.kennel_members;
create policy "Kennel owners can add members"
on public.kennel_members for insert
to authenticated
with check (profile_id = auth.uid() or public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel owners can update members" on public.kennel_members;
create policy "Kennel owners can update members"
on public.kennel_members for update
to authenticated
using (public.is_kennel_owner(kennel_id))
with check (public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel owners can remove members" on public.kennel_members;
create policy "Kennel owners can remove members"
on public.kennel_members for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel members can read litters" on public.litters;
create policy "Kennel members can read litters"
on public.litters for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create litters" on public.litters;
create policy "Kennel members can create litters"
on public.litters for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update litters" on public.litters;
create policy "Kennel members can update litters"
on public.litters for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete litters" on public.litters;
create policy "Kennel owners can delete litters"
on public.litters for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel members can read clients" on public.clients;
create policy "Kennel members can read clients"
on public.clients for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create clients" on public.clients;
create policy "Kennel members can create clients"
on public.clients for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update clients" on public.clients;
create policy "Kennel members can update clients"
on public.clients for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete clients" on public.clients;
create policy "Kennel owners can delete clients"
on public.clients for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel members can read puppies" on public.puppies;
create policy "Kennel members can read puppies"
on public.puppies for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create puppies" on public.puppies;
create policy "Kennel members can create puppies"
on public.puppies for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update puppies" on public.puppies;
create policy "Kennel members can update puppies"
on public.puppies for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete puppies" on public.puppies;
create policy "Kennel owners can delete puppies"
on public.puppies for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel members can read reservations" on public.reservations;
create policy "Kennel members can read reservations"
on public.reservations for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create reservations" on public.reservations;
create policy "Kennel members can create reservations"
on public.reservations for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update reservations" on public.reservations;
create policy "Kennel members can update reservations"
on public.reservations for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete reservations" on public.reservations;
create policy "Kennel owners can delete reservations"
on public.reservations for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel members can read documents" on public.documents;
create policy "Kennel members can read documents"
on public.documents for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create documents" on public.documents;
create policy "Kennel members can create documents"
on public.documents for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update documents" on public.documents;
create policy "Kennel members can update documents"
on public.documents for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete documents" on public.documents;
create policy "Kennel owners can delete documents"
on public.documents for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Kennel members can read promotions" on public.promotions;
create policy "Kennel members can read promotions"
on public.promotions for select
to authenticated
using (is_global = true or public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create kennel promotions" on public.promotions;
create policy "Kennel members can create kennel promotions"
on public.promotions for insert
to authenticated
with check (
  created_by = auth.uid()
  and is_global = false
  and kennel_id is not null
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Kennel members can update kennel promotions" on public.promotions;
create policy "Kennel members can update kennel promotions"
on public.promotions for update
to authenticated
using (
  is_global = false
  and kennel_id is not null
  and public.is_kennel_member(kennel_id)
)
with check (
  is_global = false
  and kennel_id is not null
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Kennel owners can delete kennel promotions" on public.promotions;
create policy "Kennel owners can delete kennel promotions"
on public.promotions for delete
to authenticated
using (
  is_global = false
  and kennel_id is not null
  and public.is_kennel_owner(kennel_id)
);

drop policy if exists "Kennel members can read notifications" on public.notifications;
create policy "Kennel members can read notifications"
on public.notifications for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create notifications" on public.notifications;
create policy "Kennel members can create notifications"
on public.notifications for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update notifications" on public.notifications;
create policy "Kennel members can update notifications"
on public.notifications for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete notifications" on public.notifications;
create policy "Kennel owners can delete notifications"
on public.notifications for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Users can read own push tokens" on public.push_tokens;
create policy "Users can read own push tokens"
on public.push_tokens for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Users can create own push tokens" on public.push_tokens;
create policy "Users can create own push tokens"
on public.push_tokens for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Users can update own push tokens" on public.push_tokens;
create policy "Users can update own push tokens"
on public.push_tokens for update
to authenticated
using (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
)
with check (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Users can delete own push tokens" on public.push_tokens;
create policy "Users can delete own push tokens"
on public.push_tokens for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);
