create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  kennel_id uuid not null references public.kennels(id) on delete cascade,
  entity_type text not null check (entity_type in ('dog', 'puppy', 'litter', 'client')),
  entity_id uuid not null,
  title text not null check (length(trim(title)) >= 1),
  document_type text not null default 'other' check (
    document_type in (
      'genetic_analysis',
      'pedigree',
      'contract',
      'vaccine_record',
      'veterinary_report',
      'recommendation',
      'other'
    )
  ),
  url text not null,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_kennel_id_idx on public.documents(kennel_id);
create index if not exists documents_entity_idx on public.documents(kennel_id, entity_type, entity_id);
create index if not exists documents_type_idx on public.documents(kennel_id, document_type);
create unique index if not exists documents_file_path_idx on public.documents(file_path);

create or replace function public.ensure_document_entity_belongs_to_kennel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.entity_type = 'dog' then
    if not exists (
      select 1
      from public.dogs
      where dogs.id = new.entity_id
        and dogs.kennel_id = new.kennel_id
    ) then
      raise exception 'Dog must belong to the document kennel';
    end if;
  elsif new.entity_type = 'puppy' then
    if not exists (
      select 1
      from public.puppies
      where puppies.id = new.entity_id
        and puppies.kennel_id = new.kennel_id
    ) then
      raise exception 'Puppy must belong to the document kennel';
    end if;
  elsif new.entity_type = 'litter' then
    if not exists (
      select 1
      from public.litters
      where litters.id = new.entity_id
        and litters.kennel_id = new.kennel_id
    ) then
      raise exception 'Litter must belong to the document kennel';
    end if;
  elsif new.entity_type = 'client' then
    if not exists (
      select 1
      from public.clients
      where clients.id = new.entity_id
        and clients.kennel_id = new.kennel_id
    ) then
      raise exception 'Client must belong to the document kennel';
    end if;
  else
    raise exception 'Unsupported document entity type';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_document_entity_belongs_to_kennel on public.documents;
create trigger ensure_document_entity_belongs_to_kennel
before insert or update on public.documents
for each row execute function public.ensure_document_entity_belongs_to_kennel();

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

drop policy if exists "Kennel members can read documents" on public.documents;
create policy "Kennel members can read documents"
on public.documents for select
to authenticated
using (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can create documents" on public.documents;
create policy "Kennel members can create documents"
on public.documents for insert
to authenticated
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel members can update documents" on public.documents;
create policy "Kennel members can update documents"
on public.documents for update
to authenticated
using (public.is_kennel_member(kennel_id))
with check (public.is_kennel_member(kennel_id));

drop policy if exists "Kennel owners can delete documents" on public.documents;
create policy "Kennel owners can delete documents"
on public.documents for delete
to authenticated
using (public.is_kennel_owner(kennel_id));

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update
set public = false;

create or replace function public.storage_path_kennel_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  kennel_id_text text;
begin
  if split_part(object_name, '/', 1) <> 'kennels' then
    return null;
  end if;

  kennel_id_text := split_part(object_name, '/', 2);

  if kennel_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;

  return kennel_id_text::uuid;
end;
$$;

drop policy if exists "Kennel members can read document files" on storage.objects;
create policy "Kennel members can read document files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and public.is_kennel_member(public.storage_path_kennel_id(name))
);

drop policy if exists "Kennel members can upload document files" on storage.objects;
create policy "Kennel members can upload document files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and public.is_kennel_member(public.storage_path_kennel_id(name))
  and split_part(name, '/', 1) = 'kennels'
  and split_part(name, '/', 3) in ('dog', 'puppy', 'litter', 'client')
);

drop policy if exists "Kennel members can update document files" on storage.objects;
create policy "Kennel members can update document files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and public.is_kennel_member(public.storage_path_kennel_id(name))
)
with check (
  bucket_id = 'documents'
  and public.is_kennel_member(public.storage_path_kennel_id(name))
  and split_part(name, '/', 1) = 'kennels'
  and split_part(name, '/', 3) in ('dog', 'puppy', 'litter', 'client')
);

drop policy if exists "Kennel owners can delete document files" on storage.objects;
create policy "Kennel owners can delete document files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and public.is_kennel_owner(public.storage_path_kennel_id(name))
);
