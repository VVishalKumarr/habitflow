// Backend integration + authorization tests against the real Supabase project.
// Run: node --env-file=.env tests/api-security.test.mjs
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_ANON_KEY
const DOMAIN = 'habitflow.local'
const suffix = Date.now().toString(36)
const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

let passed = 0
async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`)
    process.exitCode = 1
  }
}

async function signUp(username, password = 'correct-horse-9') {
  const c = client()
  const { data, error } = await c.auth.signUp({ email: `${username}@${DOMAIN}`, password, options: { data: { username } } })
  if (error) throw error
  assert.ok(data.session, 'sign-up should return a session (auto-confirm on)')
  return { c, id: data.user.id }
}

console.log('HabitFlow backend tests')
const alice = await signUp(`alice_${suffix}`)
const bob = await signUp(`bob_${suffix}`)
let aTracker, aSlot, aTask

await test('profile row created by trigger with username', async () => {
  const { data, error } = await alice.c.from('profiles').select('username, week_start, time_format, theme').single()
  assert.ifError(error)
  assert.equal(data.username, `alice_${suffix}`)
})

await test('duplicate username is rejected', async () => {
  const { data, error } = await client().auth.signUp({ email: `alice_${suffix}@${DOMAIN}`, password: 'another-pass-1', options: { data: { username: `alice_${suffix}` } } })
  assert.ok(error || data.user?.identities?.length === 0, 'expected duplicate to fail')
})

await test('sign-up with mismatched username/login is rejected', async () => {
  const { error } = await client().auth.signUp({ email: `mallory_${suffix}@${DOMAIN}`, password: 'another-pass-1', options: { data: { username: `other_${suffix}` } } })
  assert.ok(error, 'expected trigger to reject')
})

await test('short password is rejected', async () => {
  const { error } = await client().auth.signUp({ email: `shorty_${suffix}@${DOMAIN}`, password: 'abc', options: { data: { username: `shorty_${suffix}` } } })
  assert.ok(error)
})

await test('wrong password fails login', async () => {
  const { error } = await client().auth.signInWithPassword({ email: `alice_${suffix}@${DOMAIN}`, password: 'wrong-password' })
  assert.match(error?.message ?? '', /invalid login credentials/i)
})

await test('alice creates tracker, slot, task and completion', async () => {
  let r = await alice.c.from('trackers').insert({ name: 'Home Routine' }).select().single()
  assert.ifError(r.error)
  aTracker = r.data
  r = await alice.c.from('time_slots').insert({ tracker_id: aTracker.id, start_time: '17:00', end_time: '18:00' }).select().single()
  assert.ifError(r.error)
  aSlot = r.data
  r = await alice.c.from('tasks').insert({ tracker_id: aTracker.id, time_slot_id: aSlot.id, day_of_week: 1, title: 'Study', category: 'study' }).select().single()
  assert.ifError(r.error)
  aTask = r.data
  r = await alice.c.from('task_completions').upsert({ task_id: aTask.id, tracker_id: aTracker.id, completion_date: '2026-09-21', completed: true }, { onConflict: 'task_id,completion_date' })
  assert.ifError(r.error)
  r = await alice.c.from('task_completions').upsert({ task_id: aTask.id, tracker_id: aTracker.id, completion_date: '2026-09-21', completed: false }, { onConflict: 'task_id,completion_date' })
  assert.ifError(r.error)
  r = await alice.c.from('task_completions').select('completed').eq('task_id', aTask.id)
  assert.equal(r.data.length, 1)
  assert.equal(r.data[0].completed, false)
})

await test('overlapping time slot is rejected; touching slot allowed', async () => {
  let r = await alice.c.from('time_slots').insert({ tracker_id: aTracker.id, start_time: '17:30', end_time: '18:30' })
  assert.ok(r.error, 'overlap should fail')
  r = await alice.c.from('time_slots').insert({ tracker_id: aTracker.id, start_time: '18:00', end_time: '19:30' })
  assert.ifError(r.error)
})

await test('end before start is rejected', async () => {
  const r = await alice.c.from('time_slots').insert({ tracker_id: aTracker.id, start_time: '21:00', end_time: '20:00' })
  assert.ok(r.error)
})

await test('bob cannot read any of alice’s rows', async () => {
  for (const t of ['profiles', 'trackers', 'time_slots', 'tasks', 'task_completions']) {
    const { data, error } = await bob.c.from(t).select('*')
    assert.ifError(error)
    const foreign = data.filter((row) => (row.user_id ?? row.id) === alice.id)
    assert.equal(foreign.length, 0, `bob saw alice's ${t}`)
  }
})

await test('bob cannot update or delete alice’s tracker', async () => {
  await bob.c.from('trackers').update({ name: 'hacked' }).eq('id', aTracker.id)
  await bob.c.from('trackers').delete().eq('id', aTracker.id)
  const { data } = await alice.c.from('trackers').select('name').eq('id', aTracker.id).single()
  assert.equal(data.name, 'Home Routine')
})

await test('bob cannot attach rows to alice’s tracker/task', async () => {
  let r = await bob.c.from('time_slots').insert({ tracker_id: aTracker.id, start_time: '06:00', end_time: '07:00' })
  assert.ok(r.error, 'slot insert into foreign tracker should fail')
  r = await bob.c.from('tasks').insert({ tracker_id: aTracker.id, time_slot_id: aSlot.id, day_of_week: 2, title: 'x' })
  assert.ok(r.error, 'task insert into foreign tracker should fail')
  r = await bob.c.from('task_completions').insert({ task_id: aTask.id, tracker_id: aTracker.id, completion_date: '2026-09-22' })
  assert.ok(r.error, 'completion on foreign task should fail')
  r = await bob.c.from('trackers').insert({ name: 'spoof', user_id: alice.id })
  assert.ok(r.error, 'spoofing user_id should fail')
})

await test('users cannot change their own username', async () => {
  const r = await alice.c.from('profiles').update({ username: 'admin' }).eq('id', alice.id)
  assert.ok(r.error)
})

await test('anonymous clients see nothing', async () => {
  const { data } = await client().from('trackers').select('*')
  assert.equal((data ?? []).length, 0)
})

await test('deleting a tracker cascades its data', async () => {
  const r = await alice.c.from('trackers').delete().eq('id', aTracker.id)
  assert.ifError(r.error)
  const t = await alice.c.from('tasks').select('id')
  assert.equal(t.data.length, 0)
})

await test('delete_account removes the user (cleanup)', async () => {
  for (const u of [alice, bob]) {
    const r = await u.c.rpc('delete_account')
    assert.ifError(r.error)
  }
  const { error } = await client().auth.signInWithPassword({ email: `alice_${suffix}@${DOMAIN}`, password: 'correct-horse-9' })
  assert.ok(error)
})

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`)
