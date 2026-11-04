alter table public.profiles
  add column if not exists provider_type text;

alter table public.profiles
  drop constraint if exists profiles_provider_type_check;

alter table public.profiles
  add constraint profiles_provider_type_check
  check (provider_type is null or provider_type in ('individual', 'garage'));

alter table public.mechanic_profiles
  add column if not exists provider_type text not null default 'individual';

alter table public.mechanic_profiles
  drop constraint if exists mechanic_profiles_provider_type_check;

alter table public.mechanic_profiles
  add constraint mechanic_profiles_provider_type_check
  check (provider_type in ('individual', 'garage'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name, phone, role, provider_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case
      when new.raw_user_meta_data ->> 'role' in ('motorist', 'mechanic', 'partsdealer', 'towing', 'rider')
        then new.raw_user_meta_data ->> 'role'
      else 'motorist'
    end,
    case
      when new.raw_user_meta_data ->> 'role' = 'mechanic'
       and new.raw_user_meta_data ->> 'provider_type' in ('individual', 'garage')
        then new.raw_user_meta_data ->> 'provider_type'
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
