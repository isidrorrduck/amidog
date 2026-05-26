drop index if exists public.reservations_active_puppy_idx;
drop index if exists public.reservations_litter_id_idx;

alter table public.reservations drop constraint if exists reservations_status_check;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'deposit_paid'
  ) then
    update public.reservations
    set status = 'paid'
    where deposit_paid is true
      and status in ('pending', 'reserved');
  end if;
end;
$$;

update public.reservations
set status = 'pending'
where status = 'reserved';
alter table public.reservations
  add constraint reservations_status_check
  check (status in ('pending', 'paid', 'cancelled', 'completed'));

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'reserved_price'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'final_price'
  ) then
    alter table public.reservations rename column reserved_price to final_price;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'final_price'
  ) then
    alter table public.reservations add column final_price numeric(12, 2);
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'reserved_price'
  ) then
    update public.reservations
    set final_price = coalesce(final_price, reserved_price);
    alter table public.reservations drop column reserved_price;
  end if;
end;
$$;

alter table public.reservations drop column if exists reserved_price;
alter table public.reservations drop column if exists deposit_paid;
alter table public.reservations drop column if exists litter_id;

alter table public.reservations drop constraint if exists reservations_deposit_amount_check;
alter table public.reservations
  add constraint reservations_deposit_amount_check
  check (deposit_amount is null or deposit_amount >= 0);

alter table public.reservations drop constraint if exists reservations_final_price_check;
alter table public.reservations
  add constraint reservations_final_price_check
  check (final_price is null or final_price >= 0);

create index if not exists reservations_kennel_status_idx on public.reservations(kennel_id, status);
create index if not exists reservations_kennel_date_idx on public.reservations(kennel_id, reservation_date);

create unique index if not exists reservations_active_puppy_idx
on public.reservations(puppy_id)
where status in ('pending', 'paid');

create or replace function public.ensure_reservation_relations_belong_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.puppies
    where puppies.id = new.puppy_id
      and puppies.kennel_id = new.kennel_id
  ) then
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

  return new;
end;
$$;

drop trigger if exists ensure_reservation_relations_belong_to_kennel on public.reservations;
create trigger ensure_reservation_relations_belong_to_kennel
before insert or update on public.reservations
for each row execute function public.ensure_reservation_relations_belong_to_kennel();

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
