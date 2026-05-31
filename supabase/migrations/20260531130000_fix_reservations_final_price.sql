alter table public.reservations
  add column if not exists final_price numeric(12, 2);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'reserved_price'
  ) then
    execute '
      update public.reservations
      set final_price = reserved_price
      where final_price is null
        and reserved_price is not null
    ';
  end if;
end;
$$;

notify pgrst, 'reload schema';
