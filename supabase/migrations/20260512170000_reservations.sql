create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  puppy_id uuid not null references public.puppies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  litter_id uuid references public.litters(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'reserved', 'paid', 'cancelled', 'completed')),
  reserved_price numeric(12, 2) check (reserved_price is null or reserved_price >= 0),
  deposit_amount numeric(12, 2) check (deposit_amount is null or deposit_amount >= 0),
  deposit_paid boolean not null default false,
  reservation_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_kennel_id_idx on public.reservations(kennel_id);
create index if not exists reservations_puppy_id_idx on public.reservations(puppy_id);
create index if not exists reservations_client_id_idx on public.reservations(client_id);
create index if not exists reservations_litter_id_idx on public.reservations(litter_id);
create index if not exists reservations_kennel_status_idx on public.reservations(kennel_id, status);
create index if not exists reservations_kennel_date_idx on public.reservations(kennel_id, reservation_date);

create unique index if not exists reservations_active_puppy_idx
on public.reservations(puppy_id)
where status in ('pending', 'reserved', 'paid');

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

alter table public.reservations enable row level security;

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
