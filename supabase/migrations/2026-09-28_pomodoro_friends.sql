-- Adds Pomodoro sessions and friends (already included in supabase/schema.sql).
-- Safe to run more than once.

-- =====================================================================
-- Pomodoro focus sessions
-- =====================================================================
create table if not exists public.pomodoro_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label           text not null check (char_length(btrim(label)) between 1 and 100),
  planned_minutes smallint not null check (planned_minutes between 1 and 240),
  focus_seconds   integer not null check (focus_seconds between 60 and 14400),
  -- true = the timer ran to the end, false = the user finished early
  completed       boolean not null default true,
  -- local calendar date the session ended on (client time zone)
  session_date    date not null,
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  created_at      timestamptz not null default now(),
  check (ended_at >= started_at)
);
create index if not exists pomodoro_user_date_idx on public.pomodoro_sessions (user_id, session_date);

alter table public.pomodoro_sessions enable row level security;
revoke all on public.pomodoro_sessions from anon;
drop policy if exists "own rows" on public.pomodoro_sessions;
create policy "own rows" on public.pomodoro_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, delete on public.pomodoro_sessions to authenticated;

-- =====================================================================
-- Friends
--  * One row per pair of users, whichever direction the request went.
--  * Rows are only created / accepted through the functions below, so a
--    user can never browse profiles or fake an accepted friendship.
--  * Either side can read the row and delete it (decline / cancel / unfriend).
-- =====================================================================
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
drop policy if exists "parties read" on public.friendships;
create policy "parties read" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
drop policy if exists "parties delete" on public.friendships;
create policy "parties delete" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
grant select, delete on public.friendships to authenticated;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  );
$$;
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- Send a request by username. If they already asked you, this accepts it.
-- Returns 'sent' or 'accepted'.
create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing public.friendships;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  select p.id into them from public.profiles p where p.username = lower(btrim(p_username));
  if them is null then
    raise exception 'No user with that username.';
  end if;
  if them = me then
    raise exception 'You can''t add yourself.';
  end if;

  select * into existing from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, them)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, them);

  if existing.id is not null then
    if existing.status = 'accepted' then
      raise exception 'You are already friends.';
    elsif existing.requester_id = me then
      raise exception 'Friend request already sent.';
    end if;
    update public.friendships set status = 'accepted', responded_at = now() where id = existing.id;
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, them);
  return 'sent';
end;
$$;

-- Accept or decline a request addressed to you.
create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
    where id = p_id and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships
    where id = p_id and addressee_id = auth.uid() and status = 'pending';
  end if;
  if not found then
    raise exception 'That request is no longer available.';
  end if;
end;
$$;

-- Your friends and pending requests, with the other person's username.
create or replace function public.list_friends()
returns table (id uuid, friend_id uuid, username text, status text, incoming boolean, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id,
         p.id,
         p.username,
         f.status,
         f.addressee_id = auth.uid(),
         f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by f.status, p.username;
$$;

-- Daily Pomodoro and timetable totals for you and one friend, for comparison.
-- p_tz is the viewer's IANA time zone, used to date each task's creation.
create or replace function public.compare_progress(p_friend uuid, p_from date, p_to date, p_tz text default 'UTC')
returns table (
  user_id         uuid,
  day             date,
  focus_seconds   integer,
  sessions        integer,
  tasks_scheduled integer,
  tasks_completed integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  tz text := coalesce(nullif(p_tz, ''), 'UTC');
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if p_friend <> me and not public.are_friends(me, p_friend) then
    raise exception 'You can only compare with friends.';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'Invalid date range.';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = tz) then
    tz := 'UTC';
  end if;

  return query
  with days as (
    select d::date as d_day from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  ),
  people as (
    select distinct unnest(array[me, p_friend]) as uid
  ),
  sched as (
    select t.user_id as uid, dd.d_day,
           count(*)::int as scheduled,
           (count(*) filter (where c.completed))::int as done
    from days dd
    join public.tasks t
      on t.user_id in (me, p_friend)
     and t.day_of_week = extract(dow from dd.d_day)::int
    left join public.task_completions c
      on c.task_id = t.id and c.completion_date = dd.d_day
    where dd.d_day >= (t.created_at at time zone tz)::date or c.completed
    group by t.user_id, dd.d_day
  ),
  focus as (
    select s.user_id as uid, s.session_date as d_day,
           sum(s.focus_seconds)::int as secs,
           count(*)::int as n
    from public.pomodoro_sessions s
    where s.user_id in (me, p_friend) and s.session_date between p_from and p_to
    group by s.user_id, s.session_date
  )
  select p.uid, dd.d_day,
         coalesce(f.secs, 0), coalesce(f.n, 0),
         coalesce(s.scheduled, 0), coalesce(s.done, 0)
  from people p
  cross join days dd
  left join sched s on s.uid = p.uid and s.d_day = dd.d_day
  left join focus f on f.uid = p.uid and f.d_day = dd.d_day
  order by p.uid, dd.d_day;
end;
$$;

revoke execute on function public.send_friend_request(text) from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.list_friends() from public, anon;
revoke execute on function public.compare_progress(uuid, date, date, text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.compare_progress(uuid, date, date, text) to authenticated;
