alter table public.vehicles
  add column if not exists fuel_type text;

update public.vehicles
set fuel_type = case
  when power_source = 'Petrol' then 'Petrol'
  when power_source = 'Diesel' then 'Diesel'
  else fuel_type
end;

update public.vehicles
set power_source = case
  when power_source in ('Petrol', 'Diesel', 'LPG') then 'Non-hybrid'
  when power_source = 'Hybrid' then 'Hybrid'
  when power_source = 'Electric' then 'Electric'
  else 'Non-hybrid'
end;

alter table public.vehicles
  drop constraint if exists vehicles_power_source_check;

alter table public.vehicles
  add constraint vehicles_power_source_check
  check (power_source in ('Non-hybrid', 'Hybrid', 'Electric'));

alter table public.vehicles
  drop constraint if exists vehicles_fuel_type_check;

alter table public.vehicles
  add constraint vehicles_fuel_type_check
  check (fuel_type is null or fuel_type in ('Petrol', 'Diesel'));
