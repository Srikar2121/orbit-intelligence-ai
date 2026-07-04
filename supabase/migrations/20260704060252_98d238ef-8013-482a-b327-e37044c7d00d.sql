
create or replace function public.award_game_credits(_model text, _credits int)
returns table(remaining int, quota int, plan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'utc')::date;
  _plan text := 'free';
  _quota int := 20;
  _count int := 0;
  _c int := coalesce(_credits, 1);
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
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
$$;

grant execute on function public.award_game_credits(text, int) to authenticated;
