create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kennels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kennel_memberships (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (kennel_id, profile_id)
);

create index if not exists kennels_owner_id_idx on public.kennels(owner_id);
create index if not exists kennel_memberships_profile_id_idx on public.kennel_memberships(profile_id);

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

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_kennels_updated_at on public.kennels;
create trigger set_kennels_updated_at
before update on public.kennels
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.kennels enable row level security;
alter table public.kennel_memberships enable row level security;

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

drop policy if exists "Users can read owned kennels" on public.kennels;
create policy "Users can read owned kennels"
on public.kennels for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.kennel_memberships
    where kennel_memberships.kennel_id = kennels.id
      and kennel_memberships.profile_id = auth.uid()
  )
);

drop policy if exists "Users can create owned kennels" on public.kennels;
create policy "Users can create owned kennels"
on public.kennels for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update kennels" on public.kennels;
create policy "Owners can update kennels"
on public.kennels for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can read own kennel memberships" on public.kennel_memberships;
create policy "Users can read own kennel memberships"
on public.kennel_memberships for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Users can create owner membership for own kennel" on public.kennel_memberships;
create policy "Users can create owner membership for own kennel"
on public.kennel_memberships for insert
to authenticated
with check (
  profile_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.kennels
    where kennels.id = kennel_memberships.kennel_id
      and kennels.owner_id = auth.uid()
  )
);
