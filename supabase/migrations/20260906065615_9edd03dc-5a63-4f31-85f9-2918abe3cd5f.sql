-- Roles
create type public.app_role as enum ('admin','teacher','student');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Users claim own role" on public.user_roles
  for insert to authenticated with check (auth.uid() = user_id and role <> 'admin');

-- Contact email for reminders
alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists reminders_enabled boolean not null default true;

-- Portal posts
create table public.portal_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'announcement',
  title text not null,
  body text not null default '',
  link_url text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.portal_posts to authenticated;
grant all on public.portal_posts to service_role;
alter table public.portal_posts enable row level security;

create policy "Teachers read posts" on public.portal_posts
  for select to authenticated using (public.has_role(auth.uid(), 'teacher'));
create policy "Teachers create own posts" on public.portal_posts
  for insert to authenticated with check (auth.uid() = author_id and public.has_role(auth.uid(), 'teacher'));
create policy "Teachers update own posts" on public.portal_posts
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Teachers delete own posts" on public.portal_posts
  for delete to authenticated using (auth.uid() = author_id);

create trigger portal_posts_touch_updated_at before update on public.portal_posts
  for each row execute function public.touch_updated_at();

-- Events
create table public.portal_events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meet_url text,
  remind_daily boolean not null default false,
  remind_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.portal_events to authenticated;
grant all on public.portal_events to service_role;
alter table public.portal_events enable row level security;

create policy "Teachers read events" on public.portal_events
  for select to authenticated using (public.has_role(auth.uid(), 'teacher'));
create policy "Teachers create events" on public.portal_events
  for insert to authenticated with check (auth.uid() = created_by and public.has_role(auth.uid(), 'teacher'));
create policy "Owners update events" on public.portal_events
  for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "Owners delete events" on public.portal_events
  for delete to authenticated using (auth.uid() = created_by);

create trigger portal_events_touch_updated_at before update on public.portal_events
  for each row execute function public.touch_updated_at();

-- Reminder log (server-only)
create table public.event_reminder_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.portal_events(id) on delete cascade,
  recipient_email text not null,
  send_date date not null,
  created_at timestamptz not null default now(),
  unique (event_id, recipient_email, send_date)
);

grant all on public.event_reminder_log to service_role;
alter table public.event_reminder_log enable row level security;

-- Seed Teachers' Day event
insert into public.portal_events (title, description, starts_at, ends_at, meet_url, remind_daily, remind_until)
values (
  'Teachers'' Day Celebration',
  'Live Teachers'' Day meet on OrbitIntelligenceAI. Join to share stories and celebrate our mentors.',
  timestamptz '2026-09-05 09:00:00+05:30',
  timestamptz '2026-09-05 10:00:00+05:30',
  'https://meet.google.com/joi-zkhe-bne',
  true,
  date '2027-09-05'
);