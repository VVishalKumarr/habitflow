// Delete account (signed in). POST { password }
// Checks the password, cancels any active Razorpay subscription immediately,
// then deletes the auth user; all app data is removed by ON DELETE CASCADE.
// Google Play subscriptions can only be cancelled by the user in Play (the
// app tells them); Play stops access when it lapses.
import { adminClient, json, preflight, readJson, userFromRequest } from '../_shared/http.ts'
import { razorpay, razorpayConfigured } from '../_shared/razorpay.ts'

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early

  const who = await userFromRequest(req)
  if (!who) return json(req, { error: 'Please log in again.' }, 401)

  const body = await readJson<{ password?: string }>(req)
  const { data: ok, error: pwError } = await who.client.rpc('check_password', { p_password: body?.password ?? '' })
  if (pwError) return json(req, { error: pwError.message }, 429)
  if (!ok) return json(req, { error: 'Current password is incorrect.' }, 403)

  const admin = adminClient()
  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, provider, provider_subscription_id, status')
    .eq('user_id', who.user.id)
    .in('status', ['created', 'active', 'past_due', 'trialing'])

  for (const s of subs ?? []) {
    if (s.provider === 'razorpay' && razorpayConfigured()) {
      try {
        await razorpay(`/subscriptions/${s.provider_subscription_id}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 0 } })
      } catch (e) {
        console.error('razorpay cancel on delete failed', String(e))
        return json(req, { error: 'We couldn’t cancel your subscription automatically. Please try again or contact support.' }, 502)
      }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(who.user.id)
  if (error) {
    console.error('delete user failed', error.message)
    return json(req, { error: 'Could not delete the account. Please try again.' }, 500)
  }
  return json(req, { ok: true })
})
