
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  birth_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (char_length(username) between 2 and 40)
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select to authenticated using (true);

create policy "Users manage own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users delete own profile"
  on public.profiles for delete to authenticated using (auth.uid() = id);

-- Age-check trigger (>=13)
create or replace function public.enforce_min_age()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.birth_date is null or new.birth_date > (current_date - interval '13 years') then
    raise exception 'You must be at least 13 years old to sign up.';
  end if;
  return new;
end;
$$;

create trigger profiles_age_check
  before insert or update of birth_date on public.profiles
  for each row execute function public.enforce_min_age();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- chat_threads
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  mode text not null default 'genz',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chat_threads to authenticated;
grant all on public.chat_threads to service_role;
alter table public.chat_threads enable row level security;

create policy "Users view own threads" on public.chat_threads
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own threads" on public.chat_threads
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own threads" on public.chat_threads
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own threads" on public.chat_threads
  for delete to authenticated using (auth.uid() = user_id);

create trigger chat_threads_touch_updated_at
  before update on public.chat_threads
  for each row execute function public.touch_updated_at();

create index chat_threads_user_idx on public.chat_threads(user_id, updated_at desc);

-- chat_messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;

create policy "Users view own messages" on public.chat_messages
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own messages" on public.chat_messages
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own messages" on public.chat_messages
  for delete to authenticated using (auth.uid() = user_id);

create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);
