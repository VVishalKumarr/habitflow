# Database

Postgres on Supabase. Full schema: `supabase/schema.sql` (idempotent).
Incremental changes: `supabase/migrations/` (apply the newest to an existing project).
Every table has Row Level Security (RLS); the browser only ever uses the public key.

## Tables

| Table | Rows | Who can read | Who can write |
| --- | --- | --- | --- |
| `profiles` | one per user: username, preferences, `accent_theme`, `share_progress`, `leaderboard_opt_in` | own row | own preference columns only; username only via `change_username()` |
| `trackers`, `time_slots`, `tasks`, `task_completions` | timetable data | own rows | own rows (composite FKs stop cross-user links) |
| `pomodoro_sessions` | focus sessions | own | own (insert/delete) |
| `friendships` | one row per pair, `pending`/`accepted` | both parties | delete by either party; create/accept only via functions |
| `plans` | `free`, `pro`: prices, limits, features, provider product ids | everyone | nobody (SQL/dashboard only) |
| `subscriptions` | one per purchase/trial | own rows | **server only** (webhooks, verification, `start_trial()`) |
| `account_private` | recovery email, pending email + token hash | nobody directly (`my_account()`) | server functions / security-definer RPCs |
| `rate_events` | short-lived counters (password attempts, requests) | nobody | security-definer functions; rows expire after a day |

Deleting a user (`auth.users`) cascades to everything they own.

## Plans, limits and entitlements

`plans.limits` (JSON, `null` = unlimited) and `plans.features` (text[]) drive everything:

```sql
select id, price_monthly, price_yearly, trial_days, limits, features from public.plans;
```

Server helpers (not callable from the browser): `plan_of(user)`, `plan_limit(user, key)`,
`has_feature(user, feature)`. A user is Pro when a `subscriptions` row has
`plan='pro'` and status `active`/`trialing`/`past_due` (not expired) or `cancelled`
with `expires_at` in the future.

Enforced in the database:

- `trackers` insert trigger → `PLAN_LIMIT:trackers:N`
- `send_friend_request` / `respond_friend_request` → `PLAN_LIMIT:friends:N`
  (accepted friends + requests you sent)
- `profiles.accent_theme` change → `PRO_REQUIRED:custom_themes`
- `compare_progress` longer than `history_days` → `PRO_REQUIRED:advanced_statistics`
- `export_timetable` → `PRO_REQUIRED:csv_export`
- `friends_leaderboard` → `PRO_REQUIRED:leaderboards`

Limits never delete or hide existing data; they only block new items.

`my_entitlements()` returns `{ plan, state: FREE|PRO|TRIAL|EXPIRED, limits, features, … }`
for the UI. `start_trial()` grants one trial per account if `plans.trial_days > 0`.

## RPC functions (callable by signed-in users)

| Function | Purpose |
| --- | --- |
| `my_entitlements()`, `start_trial()` | plan state, one free trial |
| `my_account()` | username, recovery email status |
| `check_password(pw)` | verifies current password (bcrypt); 5 failures / 15 min → locked |
| `change_username(new, pw)` | renames the same account (profile + login address) |
| `remove_recovery_email(pw)`, `cancel_pending_email()` | manage recovery email |
| `confirm_recovery_email(token)` | also callable signed-out; one-time, 24 h |
| `delete_account_confirmed(pw)` | fallback deletion when the server function isn’t deployed |
| `send_friend_request`, `respond_friend_request`, `list_friends` | friends |
| `compare_progress(friend, from, to, tz)` | daily totals for you + a friend who shares |
| `friends_leaderboard(tz)` | last-7-day totals for you + opted-in friends |
| `export_timetable(from, to, tz)` | Pro export rows (own data only) |
| `delete_account()` | legacy (older app versions) |

## Future: school / coaching mode (not built)

Designed so teachers see **aggregates only**, never task text.

```sql
-- organizations (a school or coaching centre)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'school',
  created_at timestamptz not null default now()
);
-- staff membership
create table public.organization_members (
  organization_id uuid references public.organizations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('owner', 'teacher')),
  primary key (organization_id, user_id)
);
-- classes and student membership (students join with a code)
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);
create table public.class_memberships (
  class_id uuid references public.classes on delete cascade,
  user_id uuid references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
```

Access model:
- Students join a class explicitly (join code) and can leave at any time.
- Teachers read class data only through a security-definer function such as
  `class_progress(class_id, from, to)` returning **per-student daily totals**
  (scheduled, completed, focus minutes) — never task titles, descriptions, timetables.
- RLS: students see their own memberships; teachers see memberships of classes in their
  organization; nobody reads other students’ app tables directly.
- Billing: an organization-level subscription (`subscriptions.user_id` → org owner, or a
  separate `organization_subscriptions` table) that grants Pro features to members.
