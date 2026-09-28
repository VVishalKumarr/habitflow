# HabitFlow — Habit Tracker & Weekly Timetable

A responsive habit / routine tracker with multiple independent trackers, a weekly
timetable with custom time slots, per-date completion tracking, streaks and charts.
One codebase ships as a website and as an Android app (Capacitor).

- **Live site:** https://vvishalkumarr.github.io/habitflow/
- **Backend:** Supabase (Postgres + Auth + Row Level Security)

## Features

- Username + password accounts only (no email, phone or social login)
- Unlimited trackers (Home Routine, Exam Schedule, Gym…) — create, rename, switch, delete
- Weekly timetable: arbitrary time slots (add / edit / delete, overlap validation),
  click a cell to add a task, tap the circle to tick it off
- Tasks recur weekly on their weekday; **completion is stored per calendar date**
- Task options: complete / incomplete, edit or move, duplicate to another day, delete
- Week navigation (previous / next / today); mobile day view with swipe
- Today panel and today's progress with a mini week strip
- Progress page: overall %, today, weekly %, remaining, current / longest streak,
  totals, weekly bar chart, trend line (7/30/90 days), task performance, donut,
  per-task detail with history
- **Pomodoro focus timer**: focus / short / long breaks with custom lengths, name the
  task you're working on (one-tap suggestions from today's timetable), pause, finish early,
  keeps running across pages and app restarts, chime + vibration when time is up
- Progress is split into **Timetable** and **Pomodoro** tabs; Pomodoro shows focus time
  today / this week / total, streaks, daily focus chart, time per task and session history
- **Friends**: send requests by username, accept / decline, unfriend, and compare
  progress side by side (Pomodoro and timetable shown separately, 7/30/90 days)
- Settings: light / dark theme, first day of week, 12/24-hour time, JSON export,
  account deletion
- Android: back button closes dialogs → navigates → exits, safe areas, share-sheet export

## Tech stack

| Layer | Tech |
| --- | --- |
| UI | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons |
| State | Zustand (fine-grained selectors: ticking a task re-renders only that task + progress widgets) |
| Charts | Recharts (lazy-loaded with the Progress page) |
| Backend | Supabase Auth + Postgres with RLS |
| Mobile | Capacitor 8 (Android), plugins: app, status-bar, filesystem, share |
| Tests | Node integration tests (auth/RLS) + Playwright end-to-end |

## Project structure

```
├── src/
│   ├── App.tsx                 routes, guards, Android back button
│   ├── lib/                    supabase client, auth mapping, dates, time, stats engine, native helpers
│   ├── store/                  zustand stores: auth, trackers, trackerData, dialogs, view, ui
│   ├── components/
│   │   ├── layout/             AppShell (top nav, bottom tab bar, user menu), Logo
│   │   ├── dashboard/          TrackerHeader/TrackerSelector, TodayProgressCard, TodayPanel, WeekNavigator
│   │   ├── timetable/          Timetable (desktop grid), MobileDayView + MobileDaySelector, TaskChip/TaskCard, TaskCheck
│   │   ├── modals/             TaskForm, TaskOptions, TimeSlot, TrackerForm, DialogHost
│   │   ├── charts/             WeeklyChart, CompletionChart, DonutChart, TaskPerformance, TaskProgressChart
│   │   └── ui/                 Modal, ConfirmModal, Dropdown, Field, Toaster, Spinner/Skeleton, EmptyState
│   └── pages/                  Login, Register, Dashboard, Focus, Progress, Friends, Compare, Settings
├── supabase/schema.sql         tables, indexes, triggers, RLS policies, delete_account(), friends functions
├── supabase/migrations/        incremental SQL for existing projects
├── tests/                      api-security.test.mjs, e2e.mjs
├── android/                    Capacitor Android project
├── capacitor.config.ts
└── .github/workflows/deploy.yml   GitHub Pages deployment
```

## Run locally

Requirements: Node 20+.

```bash
npm install
cp .env.example .env      # then fill in the two values (see below)
npm run dev               # http://localhost:5173
```

### Environment variables

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → **publishable** (or legacy `anon`) key |

Both are public by design — never put the `service_role` / secret key in the frontend.
Security comes from the RLS policies in `supabase/schema.sql`.

## Database setup (new Supabase project)

1. Create a project at https://supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql`.
3. Authentication → Sign In / Providers → Email: keep **Email** enabled and turn
   **Confirm email OFF**; set minimum password length to 8.
4. Put the project URL + publishable key in `.env`.

### Data model

`profiles` (username, preferences) · `trackers` · `time_slots` (start/end `time`, no-overlap trigger) ·
`tasks` (tracker, slot, weekday 0–6, title, description, category) ·
`task_completions` (task, **completion_date**, completed — unique per task+date).

Every table has `user_id` and an RLS policy `user_id = auth.uid()`. Composite foreign keys
(`(tracker_id, user_id)`, `(task_id, tracker_id)` …) make it impossible to attach a row to
another user's tracker, slot or task, even through the raw API.

## How authentication works

- The UI asks only for a username and password.
- Supabase Auth requires an e-mail-shaped login, so `alice` is stored as the synthetic,
  never-contacted login `alice@habitflow.local`. A database trigger rejects any sign-up whose
  username and login do not match, and creates the `profiles` row.
- Passwords are hashed with bcrypt by Supabase Auth; they are never stored or logged by the app.
- Sessions (JWT + refresh token) persist in local storage, so reopening the site/app keeps you
  logged in until you log out. Tokens refresh automatically.
- Account deletion calls the `delete_account()` SQL function, which deletes the auth user;
  all data cascades.

## Tests

```bash
node --env-file=.env tests/api-security.test.mjs   # auth + RLS: 15 checks incl. cross-user access
npm run dev   # in another terminal
node tests/e2e.mjs                                  # 30 Playwright UI checks at 7 viewport sizes
```

(First run: `npx playwright install chromium`.)

## Deploying the website

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with the repository
**variables** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and publishes `dist/` to GitHub Pages.
Any static host works: `npm run build` and upload `dist/` (the build uses relative paths and
hash routing, so no server rewrites are needed).

## Android APK

Requirements: JDK 21, Android SDK (platform 36, build-tools), `ANDROID_HOME` set or
`android/local.properties` containing `sdk.dir=C:/Android/Sdk` (your path).

```bash
npm install
npm run build          # web build (reads .env)
npx cap sync android   # copy web assets + plugins into the Android project
npx cap open android   # optional: open in Android Studio
```

**Debug APK** (installable, signed with the debug key):

```bash
cd android
gradlew assembleDebug          # Windows: gradlew.bat assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

Shortcut: `npm run apk:debug` (Windows).

**Release APK:**

1. Create a keystore once (keep it safe — you need it for every update):
   `keytool -genkey -v -keystore habitflow-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias habitflow`
2. Build and sign:
   ```bash
   cd android
   gradlew assembleRelease
   # sign + align (build-tools):
   zipalign -v -p 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release-aligned.apk
   apksigner sign --ks ../habitflow-release.jks --out app-release.apk app-release-aligned.apk
   ```
   Or in Android Studio: *Build → Generate Signed App Bundle / APK*.
3. For the Play Store build an `.aab` instead: `gradlew bundleRelease`.

Install on a phone: enable *Install unknown apps* and open the APK, or `adb install app-debug.apk`.
