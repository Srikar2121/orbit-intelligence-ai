
CREATE OR REPLACE FUNCTION public.is_unlimited_user(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _uid
      AND lower(email) = lower('Challavenkatasrikar21@gmail.com')
  );
$$;

CREATE OR REPLACE FUNCTION public.consume_chat_quota(_model text)
RETURNS TABLE(allowed boolean, used integer, quota integer, plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  -- Unlimited allowlist: creator gets infinite credits.
  if public.is_unlimited_user(_uid) then
    return query select true, 0, 999999, 'unlimited'::text;
    return;
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
$function$;

CREATE OR REPLACE FUNCTION public.award_game_credits(_model text, _credits integer)
RETURNS TABLE(remaining integer, quota integer, plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'utc')::date;
  _plan text := 'free';
  _quota int := 20;
  _count int := 0;
  _c int := coalesce(_credits, 1);
begin
  if _uid is null then raise exception 'Not authenticated'; end if;

  if public.is_unlimited_user(_uid) then
    return query select 999999, 999999, 'unlimited'::text;
    return;
  end if;

  if _c < 1 then _c := 1; end if;
  if _c > 5 then _c := 5; end if;

  select case
           when p.plan = 'plus' and (p.plan_expires_at is null or p.plan_expires_at > now())
             then 'plus' else 'free'
         end
  into _plan
  from public.profiles p where p.id = _uid;
  if _plan is null then _plan := 'free'; end if;
  _quota := case when _plan = 'plus' then 30 else 20 end;

  insert into public.chat_usage (user_id, model, day, count, updated_at)
  values (_uid, _model, _today, greatest(-_c, -_quota), now())
  on conflict (user_id, model, day) do update
    set count = greatest(public.chat_usage.count - _c, -_quota), updated_at = now()
  returning count into _count;

  return query select greatest(_quota - _count, 0), _quota, _plan;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.is_unlimited_user(uuid) FROM PUBLIC, anon, authenticated;
