-- =====================================================================
-- HabitFlow database schema (Supabase / PostgreSQL)
--
-- Security model
--  * Accounts live in Supabase Auth (auth.users). Passwords are hashed
--    with bcrypt by Supabase and never touch these tables.
--  * The app only asks for username + password. Internally a username is
--    mapped to the synthetic login "<username>@habitflow.local"; the
--    trigger below rejects any sign-up that does not follow that shape.
--  * Every data table carries user_id and has Row Level Security that only
--    exposes rows where user_id = auth.uid().
--  * Composite foreign keys (tracker_id, user_id) etc. guarantee a row can
--    never reference a tracker / slot / task that belongs to someone else.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user (username + preferences)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text not null unique check (username ~ '^[a-z0-9_.-]{3,24}$'),
  week_start      smallint not null default 0 check (week_start in (0, 1)),
  time_format     text not null default '12h' check (time_format in ('12h', '24h')),
  theme           text not null default 'light' check (theme in ('light', 'dark')),
  last_tracker_id uuid,
  created_at      timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
  if uname !~ '^[a-z0-9_.-]{3,24}$' then
    raise exception 'Invalid username';
  end if;
  if lower(new.email) <> uname || '@habitflow.local' then
    raise exception 'Username does not match login';
  end if;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- trackers
-- ---------------------------------------------------------------------
create table if not exists public.trackers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index if not exists trackers_user_idx on public.trackers (user_id, created_at);

drop trigger if exists trackers_updated_at on public.trackers;
create trigger trackers_updated_at before update on public.trackers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- time_slots: arbitrary [start, end) ranges per tracker
-- ---------------------------------------------------------------------
create table if not exists public.time_slots (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null,
  user_id    uuid not null default auth.uid(),
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (id, tracker_id),
  foreign key (tracker_id, user_id) references public.trackers (id, user_id) on delete cascade
);
create index if not exists time_slots_tracker_idx on public.time_slots (tracker_id, start_time);
create index if not exists time_slots_user_idx on public.time_slots (user_id);

-- Reject overlapping slots inside the same tracker (touching edges are fine).
create or replace function public.check_time_slot_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.time_slots s
    where s.tracker_id = new.tracker_id
      and s.id <> new.id
      and s.start_time < new.end_time
      and new.start_time < s.end_time
  ) then
    raise exception 'Time slot overlaps an existing slot' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists time_slots_no_overlap on public.time_slots;
create trigger time_slots_no_overlap before insert or update on public.time_slots
  for each row execute function public.check_time_slot_overlap();

-- ---------------------------------------------------------------------
-- tasks: recurring weekly entries (tracker + slot + weekday)
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  tracker_id   uuid not null,
  user_id      uuid not null default auth.uid(),
  time_slot_id uuid not null,
  day_of_week  smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  title        text not null check (char_length(btrim(title)) between 1 and 100),
  description  text check (description is null or char_length(description) <= 500),
  category     text not null default 'other'
               check (category in ('study', 'exercise', 'work', 'personal', 'other')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (id, tracker_id),
  foreign key (tracker_id, user_id) references public.trackers (id, user_id) on delete cascade,
  foreign key (time_slot_id, tracker_id) references public.time_slots (id, tracker_id) on delete cascade
);
create index if not exists tasks_tracker_idx on public.tasks (tracker_id);
create index if not exists tasks_slot_idx on public.tasks (time_slot_id);
create index if not exists tasks_user_idx on public.tasks (user_id);

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- task_completions: one row per task per calendar date
-- ---------------------------------------------------------------------
create table if not exists public.task_completions (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null,
  tracker_id      uuid not null,
  user_id         uuid not null default auth.uid(),
  completion_date date not null,
  completed       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (task_id, completion_date),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  foreign key (task_id, tracker_id) references public.tasks (id, tracker_id) on delete cascade
);
create index if not exists completions_tracker_date_idx on public.task_completions (tracker_id, completion_date);
create index if not exists completions_user_idx on public.task_completions (user_id);

drop trigger if exists task_completions_updated_at on public.task_completions;
create trigger task_completions_updated_at before update on public.task_completions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.trackers         enable row level security;
alter table public.time_slots       enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_completions enable row level security;

-- Anonymous visitors get nothing.
revoke all on public.profiles, public.trackers, public.time_slots, public.tasks, public.task_completions from anon;

-- profiles: read own row, update only preference columns.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (week_start, time_format, theme, last_tracker_id) on public.profiles to authenticated;

-- Data tables: full CRUD on own rows only.
do $$
declare t text;
begin
  foreach t in array array['trackers', 'time_slots', 'tasks', 'task_completions'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Account deletion (removes the auth user; everything else cascades)
-- ---------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
