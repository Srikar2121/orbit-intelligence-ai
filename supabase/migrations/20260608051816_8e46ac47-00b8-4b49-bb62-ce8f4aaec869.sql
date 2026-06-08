-- Plan column on profiles
alter table public.profiles add column if not exists plan text not null default 'free' check (plan in ('free','plus'));
alter table public.profiles add column if not exists plan_expires_at timestamptz;

-- Per-user per-model per-day usage tracking
create table if not exists public.chat_usage (
  user_id uuid not null,
  model text not null,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, model, day)
);

grant select on public.chat_usage to authenticated;
grant all on public.chat_usage to service_role;

alter table public.chat_usage enable row level security;

create policy "Users view own usage" on public.chat_usage
  for select to authenticated using (auth.uid() = user_id);

-- Atomic check-and-increment. Returns row with allowed, count, limit_value.
create or replace function public.consume_chat_quota(_model text)
returns table (allowed boolean, used integer, quota integer, plan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _plan text := 'free';
  _quota integer := 20;
  _today date := (now() at time zone 'utc')::date;
  _count integer := 0;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  select case
           when p.plan = 'plus' and (p.plan_expires_at is null or p.plan_expires_at > now())
             then 'plus' else 'free'
         end
  into _plan
  from public.profiles p where p.id = _uid;

  if _plan is null then _plan := 'free'; end if;
  _quota := case when _plan = 'plus' then 30 else 20 end;

  select coalesce(c.count, 0) into _count
  from public.chat_usage c
  where c.user_id = _uid and c.model = _model and c.day = _today;

  if _count >= _quota then
    return query select false, _count, _quota, _plan;
    return;
  end if;

  insert into public.chat_usage (user_id, model, day, count, updated_at)
  values (_uid, _model, _today, 1, now())
  on conflict (user_id, model, day) do update
    set count = public.chat_usage.count + 1, updated_at = now()
  returning count into _count;

  return query select true, _count, _quota, _plan;
end;
$$;

grant execute on function public.consume_chat_quota(text) to authenticated;