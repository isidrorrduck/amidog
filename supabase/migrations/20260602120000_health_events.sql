create table if not exists public.health_events (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete cascade,
  puppy_id uuid references public.puppies(id) on delete cascade,
  event_type text not null,
  event_date date not null,
  title text not null,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_events_subject_check check (dog_id is not null or puppy_id is not null),
  constraint health_events_event_type_check check (
    event_type in (
      'vaccine',
      'deworming',
      'weight',
      'vet_visit',
      'medication',
      'pregnancy_check',
      'birth',
      'other'
    )
  ),
  constraint health_events_title_check check (length(trim(title)) >= 1)
);

create index if not exists health_events_kennel_id_idx on public.health_events(kennel_id);
create index if not exists health_events_dog_id_idx on public.health_events(dog_id);
create index if not exists health_events_puppy_id_idx on public.health_events(puppy_id);
create index if not exists health_events_kennel_date_idx on public.health_events(kennel_id, event_date desc);
create index if not exists health_events_kennel_type_idx on public.health_events(kennel_id, event_type);

create or replace function public.ensure_health_event_subject_belongs_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.dog_id is null and new.puppy_id is null then
    raise exception 'Health event must be linked to a dog or puppy';
  end if;

  if new.dog_id is not null and not exists (
    select 1
    from public.dogs
    where dogs.id = new.dog_id
      and dogs.kennel_id = new.kennel_id
  ) then
    raise exception 'Dog must belong to the health event kennel';
  end if;

  if new.puppy_id is not null and not exists (
    select 1
    from public.puppies
    where puppies.id = new.puppy_id
      and puppies.kennel_id = new.kennel_id
  ) then
    raise exception 'Puppy must belong to the health event kennel';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_health_event_subject_belongs_to_kennel on public.health_events;
create trigger ensure_health_event_subject_belongs_to_kennel
before insert or update on public.health_events
for each row execute function public.ensure_health_event_subject_belongs_to_kennel();

drop trigger if exists set_health_events_updated_at on public.health_events;
create trigger set_health_events_updated_at
before update on public.health_events
for each row execute function public.set_updated_at();

alter table public.health_events enable row level security;

drop policy if exists "Kennel members can read health events" on public.health_events;
create policy "Kennel members can read health events"
on public.health_events for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create health events" on public.health_events;
create policy "Kennel members can create health events"
on public.health_events for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Kennel members can update health events" on public.health_events;
create policy "Kennel members can update health events"
on public.health_events for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete health events" on public.health_events;
create policy "Kennel owners can delete health events"
on public.health_events for delete
to authenticated
using (public.is_kennel_owner(kennel_id));
