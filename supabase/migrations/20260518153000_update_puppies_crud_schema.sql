alter table public.puppies
  add column if not exists birth_date date,
  add column if not exists photo_url text,
  add column if not exists client_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'puppies_client_id_fkey'
      and conrelid = 'public.puppies'::regclass
  ) then
    alter table public.puppies
      add constraint puppies_client_id_fkey
      foreign key (client_id)
      references public.clients(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists puppies_client_id_idx on public.puppies(client_id);

alter table public.puppies drop constraint if exists puppies_status_check;

update public.puppies
set status = case status
  when 'placed' then 'sold'
  when 'kept' then 'keeper'
  else status
end
where status in ('placed', 'kept');

alter table public.puppies
  add constraint puppies_status_check
  check (status in ('available', 'reserved', 'sold', 'keeper', 'deceased'));

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
