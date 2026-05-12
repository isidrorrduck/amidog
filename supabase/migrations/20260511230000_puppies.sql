create table if not exists public.puppies (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  litter_id uuid not null references public.litters(id) on delete cascade,
  name text not null check (length(trim(name)) >= 1),
  sex text not null default 'unknown' check (sex in ('unknown', 'male', 'female')),
  color text,
  birth_weight numeric(8, 2) check (birth_weight is null or birth_weight >= 0),
  status text not null default 'available' check (status in ('available', 'reserved', 'placed', 'kept', 'deceased')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists puppies_kennel_id_idx on public.puppies(kennel_id);
create index if not exists puppies_litter_id_idx on public.puppies(litter_id);
create index if not exists puppies_kennel_litter_idx on public.puppies(kennel_id, litter_id);
create index if not exists puppies_kennel_status_idx on public.puppies(kennel_id, status);

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

alter table public.puppies enable row level security;

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
