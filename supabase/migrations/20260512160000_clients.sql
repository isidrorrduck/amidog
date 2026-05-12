create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  first_name text not null check (length(trim(first_name)) >= 1),
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_kennel_id_idx on public.clients(kennel_id);
create index if not exists clients_kennel_name_idx on public.clients(kennel_id, first_name, last_name);
create index if not exists clients_kennel_email_idx on public.clients(kennel_id, email);
create index if not exists clients_kennel_phone_idx on public.clients(kennel_id, phone);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

drop policy if exists "Kennel members can read clients" on public.clients;
create policy "Kennel members can read clients"
on public.clients for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create clients" on public.clients;
create policy "Kennel members can create clients"
on public.clients for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update clients" on public.clients;
create policy "Kennel members can update clients"
on public.clients for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete clients" on public.clients;
create policy "Kennel owners can delete clients"
on public.clients for delete
to authenticated
using (public.is_kennel_owner(kennel_id));
