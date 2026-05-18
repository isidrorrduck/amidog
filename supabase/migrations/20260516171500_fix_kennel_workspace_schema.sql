alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

update public.profiles
set email = auth.users.email
from auth.users
where public.profiles.id = auth.users.id
  and public.profiles.email is null;

alter table public.kennels add column if not exists created_by uuid references public.profiles(id) on delete cascade;
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
    from public.kennel_members
    where profile_id is null
  ) then
    alter table public.kennel_members alter column profile_id set not null;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kennel_members_profile_id_fkey'
      and conrelid = 'public.kennel_members'::regclass
  ) then
    alter table public.kennel_members
      add constraint kennel_members_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end;
$$;

create index if not exists kennels_created_by_idx on public.kennels(created_by);
create index if not exists kennel_members_kennel_id_idx on public.kennel_members(kennel_id);
create index if not exists kennel_members_profile_id_idx on public.kennel_members(profile_id);
create unique index if not exists kennel_members_kennel_id_profile_id_idx
  on public.kennel_members(kennel_id, profile_id)
  where profile_id is not null;

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

alter table public.profiles enable row level security;
alter table public.kennels enable row level security;
alter table public.kennel_members enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'kennels', 'kennel_members')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

create policy "Profiles are readable by owner"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Kennel members can read kennels"
on public.kennels for select
to authenticated
using (public.is_kennel_member(id));

create policy "Kennel owners can update kennels"
on public.kennels for update
to authenticated
using (public.is_kennel_owner(id))
with check (public.is_kennel_owner(id));

create policy "Kennel members can read members"
on public.kennel_members for select
to authenticated
using (profile_id = auth.uid() or public.is_kennel_member(kennel_id));

create policy "Kennel owners can add members"
on public.kennel_members for insert
to authenticated
with check (profile_id = auth.uid() or public.is_kennel_owner(kennel_id));

create policy "Kennel owners can update members"
on public.kennel_members for update
to authenticated
using (public.is_kennel_owner(kennel_id))
with check (public.is_kennel_owner(kennel_id));

create policy "Kennel owners can remove members"
on public.kennel_members for delete
to authenticated
using (public.is_kennel_owner(kennel_id));
