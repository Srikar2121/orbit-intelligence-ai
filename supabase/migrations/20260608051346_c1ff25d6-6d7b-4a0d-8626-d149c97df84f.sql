create or replace function public.enforce_min_age()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.birth_date is null or new.birth_date > (current_date - interval '9 years') then
    raise exception 'You must be at least 9 years old to sign up.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_min_age_trigger on public.profiles;
create trigger enforce_min_age_trigger
before insert or update on public.profiles
for each row execute function public.enforce_min_age();