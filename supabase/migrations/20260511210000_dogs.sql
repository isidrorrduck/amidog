create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  name text not null check (length(trim(name)) >= 1),
  breed text,
  sex text not null default 'unknown' check (sex in ('unknown', 'male', 'female')),
  birth_date date,
  color text,
  microchip_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
