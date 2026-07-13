create table if not exists public.puppy_experiences (
  puppy_id uuid primary key references public.puppies(id) on delete cascade,
  public_id uuid not null default gen_random_uuid() unique,
  status text not null default 'preparing' check (status in ('preparing', 'review', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.puppy_experiences is
  'One-to-one publication state for a puppy. Puppy, owner, photos and documents remain in their existing tables.';
comment on column public.puppy_experiences.public_id is
  'Opaque permanent identifier used in the public URL and its QR code.';

create index if not exists puppy_experiences_status_idx
on public.puppy_experiences(status);

create table if not exists public.experience_preparation_requests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  recipient text not null default 'isidro@sgservice.es',
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.experience_preparation_requests is
  'Idempotent delivery queue. Contact and puppy data are resolved through reservation relations at send time.';

create index if not exists experience_preparation_requests_status_idx
on public.experience_preparation_requests(status, created_at);

create or replace function public.protect_puppy_experience_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.puppy_id <> old.puppy_id or new.public_id <> old.public_id then
    raise exception 'The puppy experience public identity is permanent';
  end if;

  if new.status = 'published' and old.status <> 'published' then
    new.published_at := coalesce(new.published_at, now());
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_puppy_experience_identity on public.puppy_experiences;
create trigger protect_puppy_experience_identity
before update on public.puppy_experiences
for each row execute function public.protect_puppy_experience_identity();

drop trigger if exists set_puppy_experiences_updated_at on public.puppy_experiences;
create trigger set_puppy_experiences_updated_at
before update on public.puppy_experiences
for each row execute function public.set_updated_at();

drop trigger if exists set_experience_preparation_requests_updated_at on public.experience_preparation_requests;
create trigger set_experience_preparation_requests_updated_at
before update on public.experience_preparation_requests
for each row execute function public.set_updated_at();

create or replace function public.ensure_puppy_experience()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.puppy_experiences (puppy_id)
  values (new.id)
  on conflict (puppy_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ensure_puppy_experience on public.puppies;
create trigger ensure_puppy_experience
after insert on public.puppies
for each row execute function public.ensure_puppy_experience();

-- Existing puppies receive the same permanent public identity as future puppies.
insert into public.puppy_experiences (puppy_id)
select puppies.id
from public.puppies
on conflict (puppy_id) do nothing;

create or replace function public.prepare_experience_after_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.puppies
  set client_id = new.client_id,
      status = case when status = 'available' then 'reserved' else status end
  where id = new.puppy_id;

  insert into public.puppy_experiences (puppy_id, status)
  values (new.puppy_id, 'preparing')
  on conflict (puppy_id) do update
  set status = 'preparing',
      published_at = null;

  insert into public.experience_preparation_requests (reservation_id)
  values (new.id)
  on conflict (reservation_id) do nothing;

  return new;
end;
$$;

drop trigger if exists prepare_experience_after_reservation on public.reservations;
create trigger prepare_experience_after_reservation
after insert on public.reservations
for each row execute function public.prepare_experience_after_reservation();

alter table public.puppy_experiences enable row level security;
alter table public.experience_preparation_requests enable row level security;

drop policy if exists "Kennel members can read puppy experiences" on public.puppy_experiences;
create policy "Kennel members can read puppy experiences"
on public.puppy_experiences for select
to authenticated
using (
  exists (
    select 1 from public.puppies
    where puppies.id = puppy_experiences.puppy_id
      and public.is_kennel_member(puppies.kennel_id)
  )
);

drop policy if exists "Kennel members can update puppy experiences" on public.puppy_experiences;
create policy "Kennel members can update puppy experiences"
on public.puppy_experiences for update
to authenticated
using (
  exists (
    select 1 from public.puppies
    where puppies.id = puppy_experiences.puppy_id
      and public.is_kennel_member(puppies.kennel_id)
  )
)
with check (
  exists (
    select 1 from public.puppies
    where puppies.id = puppy_experiences.puppy_id
      and public.is_kennel_member(puppies.kennel_id)
  )
);

drop policy if exists "Kennel members can read preparation requests" on public.experience_preparation_requests;
create policy "Kennel members can read preparation requests"
on public.experience_preparation_requests for select
to authenticated
using (
  exists (
    select 1
    from public.reservations
    where reservations.id = experience_preparation_requests.reservation_id
      and public.is_kennel_member(reservations.kennel_id)
  )
);

create or replace function public.get_public_puppy_experience(p_public_id uuid)
returns table (
  public_id uuid,
  experience_status text,
  puppy_id uuid,
  kennel_id uuid,
  litter_id uuid,
  puppy_name text,
  puppy_sex text,
  puppy_birth_date date,
  puppy_color text,
  puppy_birth_weight numeric,
  puppy_photo_url text,
  puppy_status text,
  puppy_created_at timestamptz,
  puppy_updated_at timestamptz,
  litter_name text,
  breed text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    experiences.public_id,
    experiences.status,
    puppies.id,
    puppies.kennel_id,
    puppies.litter_id,
    puppies.name,
    puppies.sex,
    puppies.birth_date,
    puppies.color,
    puppies.birth_weight,
    puppies.photo_url,
    puppies.status,
    puppies.created_at,
    puppies.updated_at,
    litters.name,
    coalesce(mothers.breed, fathers.breed)
  from public.puppy_experiences as experiences
  join public.puppies on puppies.id = experiences.puppy_id
  join public.litters on litters.id = puppies.litter_id
  left join public.dogs as mothers on mothers.id = litters.mother_id
  left join public.dogs as fathers on fathers.id = litters.father_id
  where experiences.public_id = p_public_id;
$$;

revoke all on function public.get_public_puppy_experience(uuid) from public;
grant execute on function public.get_public_puppy_experience(uuid) to anon, authenticated;

create or replace function public.claim_experience_preparation_request(p_reservation_id uuid)
returns table (
  request_id uuid,
  recipient text,
  kennel_name text,
  puppy_name text,
  owner_name text,
  owner_phone text,
  owner_email text,
  litter_name text,
  public_id uuid,
  puppy_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.reservations
    where reservations.id = p_reservation_id
      and public.is_kennel_member(reservations.kennel_id)
  ) then
    raise exception 'Not authorized to send this preparation request';
  end if;

  return query
  with claimed as (
    update public.experience_preparation_requests as requests
    set status = 'sending',
        attempts = requests.attempts + 1,
        last_error = null
    where requests.reservation_id = p_reservation_id
      and (
        requests.status in ('pending', 'failed')
        or (requests.status = 'sending' and requests.updated_at < now() - interval '5 minutes')
      )
    returning requests.id, requests.reservation_id, requests.recipient
  )
  select
    claimed.id,
    claimed.recipient,
    kennels.name,
    puppies.name,
    trim(concat_ws(' ', clients.first_name, clients.last_name)),
    clients.phone,
    clients.email,
    litters.name,
    experiences.public_id,
    puppies.id
  from claimed
  join public.reservations on reservations.id = claimed.reservation_id
  join public.kennels on kennels.id = reservations.kennel_id
  join public.puppies on puppies.id = reservations.puppy_id
  join public.clients on clients.id = reservations.client_id
  join public.litters on litters.id = puppies.litter_id
  join public.puppy_experiences as experiences on experiences.puppy_id = puppies.id;
end;
$$;

revoke all on function public.claim_experience_preparation_request(uuid) from public;
grant execute on function public.claim_experience_preparation_request(uuid) to authenticated;

grant select on public.puppy_experiences to authenticated;
grant update (status, published_at) on public.puppy_experiences to authenticated;
grant select on public.experience_preparation_requests to authenticated;
