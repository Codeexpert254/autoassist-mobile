alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('motorist', 'mechanic', 'partsdealer', 'towing', 'rider'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case
      when new.raw_user_meta_data ->> 'role' in ('motorist', 'mechanic', 'partsdealer', 'towing', 'rider')
        then new.raw_user_meta_data ->> 'role'
      else 'motorist'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
