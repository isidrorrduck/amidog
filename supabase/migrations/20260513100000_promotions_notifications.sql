create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid references public.kennels(id) on delete cascade,
  title text not null check (length(trim(title)) >= 1),
  message text not null check (length(trim(message)) >= 1),
  image_url text,
  action_url text,
  promotion_type text not null default 'other' check (
    promotion_type in (
      'veterinary',
      'nutrition',
      'genetics',
      'supplements',
      'grooming',
      'kennel',
      'puppies',
      'other'
    )
  ),
  is_global boolean not null default false,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_global = true and kennel_id is null)
    or (is_global = false and kennel_id is not null)
  )
);

create index if not exists promotions_kennel_id_idx on public.promotions(kennel_id);
create index if not exists promotions_type_idx on public.promotions(promotion_type);
create index if not exists promotions_created_at_idx on public.promotions(created_at);
create index if not exists promotions_global_idx on public.promotions(is_global);

drop trigger if exists set_promotions_updated_at on public.promotions;
create trigger set_promotions_updated_at
before update on public.promotions
for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  promotion_id uuid references public.promotions(id) on delete set null,
  title text not null check (length(trim(title)) >= 1),
  body text not null check (length(trim(body)) >= 1),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_kennel_id_idx on public.notifications(kennel_id);
create index if not exists notifications_client_id_idx on public.notifications(client_id);
create index if not exists notifications_promotion_id_idx on public.notifications(promotion_id);
create index if not exists notifications_unread_idx on public.notifications(kennel_id, read_at);
create index if not exists notifications_created_at_idx on public.notifications(kennel_id, created_at);

create or replace function public.ensure_notification_relations_belong_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  promotion_kennel_id uuid;
  promotion_is_global boolean;
begin
  if new.client_id is not null and not exists (
    select 1
    from public.clients
    where clients.id = new.client_id
      and clients.kennel_id = new.kennel_id
  ) then
    raise exception 'Client must belong to the notification kennel';
  end if;

  if new.promotion_id is not null then
    select promotions.kennel_id, promotions.is_global
      into promotion_kennel_id, promotion_is_global
    from public.promotions
    where promotions.id = new.promotion_id;

    if promotion_is_global is null then
      raise exception 'Promotion must exist for the notification';
    end if;

    if promotion_is_global = false and promotion_kennel_id <> new.kennel_id then
      raise exception 'Promotion must belong to the notification kennel';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_notification_relations_belong_to_kennel on public.notifications;
create trigger ensure_notification_relations_belong_to_kennel
before insert or update on public.notifications
for each row execute function public.ensure_notification_relations_belong_to_kennel();

create or replace function public.create_notification_for_kennel_promotion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_global = false and new.kennel_id is not null then
    insert into public.notifications (kennel_id, promotion_id, title, body)
    values (new.kennel_id, new.id, new.title, new.message);
  end if;

  return new;
end;
$$;

drop trigger if exists create_notification_for_kennel_promotion on public.promotions;
create trigger create_notification_for_kennel_promotion
after insert on public.promotions
for each row execute function public.create_notification_for_kennel_promotion();

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  expo_push_token text not null check (length(trim(expo_push_token)) >= 1),
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'windows', 'macos', 'unknown')),
  created_at timestamptz not null default now(),
  unique (user_id, kennel_id, expo_push_token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);
create index if not exists push_tokens_kennel_id_idx on public.push_tokens(kennel_id);
create index if not exists push_tokens_expo_push_token_idx on public.push_tokens(expo_push_token);

alter table public.promotions enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

drop policy if exists "Kennel members can read promotions" on public.promotions;
create policy "Kennel members can read promotions"
on public.promotions for select
to authenticated
using (is_global = true or public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create kennel promotions" on public.promotions;
create policy "Kennel members can create kennel promotions"
on public.promotions for insert
to authenticated
with check (
  created_by = auth.uid()
  and is_global = false
  and kennel_id is not null
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Kennel members can update kennel promotions" on public.promotions;
create policy "Kennel members can update kennel promotions"
on public.promotions for update
to authenticated
using (
  is_global = false
  and kennel_id is not null
  and public.is_kennel_member(kennel_id)
)
with check (
  is_global = false
  and kennel_id is not null
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Kennel owners can delete kennel promotions" on public.promotions;
create policy "Kennel owners can delete kennel promotions"
on public.promotions for delete
to authenticated
using (
  is_global = false
  and kennel_id is not null
  and public.is_kennel_owner(kennel_id)
);

drop policy if exists "Kennel members can read notifications" on public.notifications;
create policy "Kennel members can read notifications"
on public.notifications for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create notifications" on public.notifications;
create policy "Kennel members can create notifications"
on public.notifications for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update notifications" on public.notifications;
create policy "Kennel members can update notifications"
on public.notifications for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete notifications" on public.notifications;
create policy "Kennel owners can delete notifications"
on public.notifications for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

drop policy if exists "Users can read own push tokens" on public.push_tokens;
create policy "Users can read own push tokens"
on public.push_tokens for select
to authenticated
using (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Users can create own push tokens" on public.push_tokens;
create policy "Users can create own push tokens"
on public.push_tokens for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Users can update own push tokens" on public.push_tokens;
create policy "Users can update own push tokens"
on public.push_tokens for update
to authenticated
using (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
)
with check (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);

drop policy if exists "Users can delete own push tokens" on public.push_tokens;
create policy "Users can delete own push tokens"
on public.push_tokens for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_kennel_member(kennel_id)
);
