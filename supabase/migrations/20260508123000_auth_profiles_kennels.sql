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
  name text not null check (length(trim(name)) >= 2),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kennel_members (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (kennel_id, profile_id)
);

create index if not exists kennels_created_by_idx on public.kennels(created_by);
create index if not exists kennel_members_kennel_id_idx on public.kennel_members(kennel_id);
create index if not exists kennel_members_profile_id_idx on public.kennel_members(profile_id);

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
    raise exception 'Not authenticated';
  end if;

  normalized_name := nullif(trim(kennel_name), '');

  if normalized_name is null or length(normalized_name) < 2 then
    raise exception 'Kennel name is required';
  end if;

  insert into public.kennels (name, created_by)
  values (normalized_name, auth.uid())
  returning id into new_kennel_id;

  insert into public.kennel_members (kennel_id, profile_id, role)
  values (new_kennel_id, auth.uid(), 'owner');

  return new_kennel_id;
end;
$$;

grant execute on function public.create_kennel(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.kennels enable row level security;
alter table public.kennel_members enable row level security;

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
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can add members" on public.kennel_members;
create policy "Kennel owners can add members"
on public.kennel_members for insert
to authenticated
with check (public.is_kennel_owner(kennel_id));

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
