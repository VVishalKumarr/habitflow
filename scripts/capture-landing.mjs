// Captures real product screenshots for the landing page into public/landing/.
// Creates a temporary demo account with a realistic week, then deletes it.
// Run with the dev server up:
//   BASE_URL=http://localhost:5173 node --env-file=.env scripts/capture-landing.mjs
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = 'public/landing'
mkdirSync(OUT, { recursive: true })
const user = `demo_${Date.now().toString(36)}`
const pass = 'demo-password-1'
const c = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: auth, error } = await c.auth.signUp({ email: `${user}@habitflow.local`, password: pass, options: { data: { username: user } } })
if (error) throw error

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const tracker = (await c.from('trackers').insert({ name: 'Exam Prep' }).select().single()).data
const slotDefs = [
  ['06:30', '07:15'],
  ['09:00', '11:00'],
  ['16:00', '17:30'],
  ['19:00', '20:00'],
]
const slots = []
for (const [s, e] of slotDefs) slots.push((await c.from('time_slots').insert({ tracker_id: tracker.id, start_time: s, end_time: e }).select().single()).data)
const plan = [
  [0, 'Morning run', 'exercise', [1, 3, 5]],
  [0, 'Yoga', 'exercise', [2, 4, 6]],
  [1, 'Maths revision', 'study', [1, 2, 3, 4, 5]],
  [2, 'Physics problems', 'study', [1, 3, 5]],
  [2, 'Chemistry notes', 'study', [2, 4]],
  [3, 'Read 20 pages', 'personal', [0, 1, 2, 3, 4, 5, 6]],
  [1, 'Mock test', 'study', [6]],
]
const tasks = []
// created 3 weeks ago so history exists
const created = new Date(Date.now() - 21 * 86400000).toISOString()
for (const [slot, title, category, days] of plan)
  for (const d of days) tasks.push((await c.from('tasks').insert({ tracker_id: tracker.id, time_slot_id: slots[slot].id, day_of_week: d, title, category, created_at: created }).select().single()).data)

// ~80% completion over the last 3 weeks, today partly done
const comps = []
for (let i = 21; i >= 0; i--) {
  const day = new Date(Date.now() - i * 86400000)
  for (const t of tasks.filter((t) => t.day_of_week === day.getDay())) {
    const done = i === 0 ? t.time_slot_id === slots[0].id || t.time_slot_id === slots[1].id : Math.random() < 0.8
    if (done) comps.push({ task_id: t.id, tracker_id: tracker.id, completion_date: iso(day), completed: true })
  }
}
await c.from('task_completions').insert(comps)
const sessions = []
for (let i = 13; i >= 0; i--) {
  const day = new Date(Date.now() - i * 86400000)
  const n = i === 0 ? 2 : Math.floor(Math.random() * 4)
  for (let k = 0; k < n; k++) {
    const end = new Date(day)
    end.setHours(9 + k * 2, 30, 0, 0)
    sessions.push({
      label: ['Maths revision', 'Physics problems', 'Chemistry notes'][k % 3],
      planned_minutes: 25,
      focus_seconds: 1500,
      completed: true,
      session_date: iso(day),
      started_at: new Date(end - 1500000).toISOString(),
      ended_at: end.toISOString(),
    })
  }
}
await c.from('pomodoro_sessions').insert(sessions)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${BASE}/login`)
await page.evaluate((s) => localStorage.setItem('habitflow-auth', JSON.stringify(s)), auth.session)
const shot = async (path, name, wait) => {
  await page.goto(`${BASE}${path}`)
  await page.getByText(wait).first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 78 })
}
await shot('/dashboard', 'dashboard', 'Maths revision')
await shot('/progress', 'progress', 'Task performance')
await page.goto(`${BASE}/focus`)
await page.getByLabel('What are you working on?').fill('Maths revision')
await page.getByRole('button', { name: 'Start' }).click()
await page.waitForTimeout(3500)
await page.screenshot({ path: `${OUT}/focus.jpg`, type: 'jpeg', quality: 78 })
await browser.close()
await c.rpc('delete_account')
console.log('Saved', ['dashboard', 'progress', 'focus'].map((n) => `${OUT}/${n}.jpg`).join(', '))
