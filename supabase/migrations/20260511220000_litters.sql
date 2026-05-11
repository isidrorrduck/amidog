create table if not exists public.litters (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  name text not null check (length(trim(name)) >= 1),
  mother_id uuid references public.dogs(id) on delete set null,
  father_id uuid references public.dogs(id) on delete set null,
  birth_date date,
  expected_birth_date date,
  status text not null default 'planned' check (status in ('planned', 'expected', 'born', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint litters_distinct_parents check (
    mother_id is null
    or father_id is null
    or mother_id <> father_id
  )
);

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

alter table public.litters enable row level security;

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
