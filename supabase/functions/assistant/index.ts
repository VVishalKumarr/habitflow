// In-app help assistant.
// POST { question, page, history? }  (signed in)
// Sends Claude only what it needs: the help articles, the current page path,
// the user's plan name and the conversation so far. Never passwords, tokens,
// emails, task names or any other account data.
import Anthropic from 'npm:@anthropic-ai/sdk'
import { helpAsText } from '../_shared/help-content.ts'
import { adminClient, env, json, preflight, rateLimited, readJson, userFromRequest } from '../_shared/http.ts'

const MODEL = env('AI_MODEL') || 'claude-opus-5-5'
const MAX_QUESTION = 1000
const MAX_TURNS = 8

const SYSTEM = `You are the help assistant inside HabitFlow, a habit tracker web and Android app with weekly timetables, a Pomodoro focus timer, progress charts, friends and an optional Pro plan.

Answer questions about using HabitFlow, using the help articles below as the source of truth. Give short, practical answers: a sentence or two, or a few numbered steps using the exact button names from the articles. If the articles don't cover something, say you're not sure rather than guessing, and suggest the Help page.

You cannot see or change the user's data and you cannot click anything. Never say you performed an action; tell the user how to do it. You don't know their tasks, stats, email or payment details, so don't claim to. For account problems you can't solve (payments, deleted data, bugs), suggest the contact address on the Privacy page.

If a question is unrelated to HabitFlow, reply briefly and steer back to how you can help with the app. Use plain text; simple numbered lists are fine, no tables or headings.

<help_articles>
${helpAsText()}
</help_articles>`

type Turn = { role: 'user' | 'assistant'; content: string }

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early

  if (!env('ANTHROPIC_API_KEY')) {
    return json(req, { error: 'The AI assistant isn’t configured.', code: 'ai_not_configured' }, 503)
  }

  const who = await userFromRequest(req)
  if (!who) return json(req, { error: 'Please log in again.' }, 401)

  const body = await readJson<{ question?: string; page?: string; history?: Turn[] }>(req)
  const question = (body?.question ?? '').trim().slice(0, MAX_QUESTION)
  if (!question) return json(req, { error: 'Ask a question first.' }, 400)
  const page = /^\/[a-z0-9/_-]{0,60}$/i.test(body?.page ?? '') ? body!.page! : '/'

  if (
    (await rateLimited(who.user.id, 'assistant_hour', 30, 3600)) ||
    (await rateLimited(who.user.id, 'assistant_day', 100, 86400))
  ) {
    return json(req, { error: 'You’ve asked a lot of questions — please try again a bit later.', code: 'rate_limited' }, 429)
  }

  // Only the plan name (Free/Plus/Pro) is shared, so answers about plans make sense.
  const admin = adminClient()
  const { data: planId } = await admin.rpc('plan_of', { p_user: who.user.id })
  const { data: planRow } = await admin.from('plans').select('name').eq('id', planId ?? 'free').maybeSingle()
  const planName = planRow?.name ?? 'Free'

  const history: Anthropic.Beta.BetaMessageParam[] = (body?.history ?? [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }))
  // The conversation must start with the user.
  while (history.length && history[0].role !== 'user') history.shift()

  const client = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), maxRetries: 1, timeout: 45_000 })
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      // Retry on a suitable model automatically if a request is declined.
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [...history, { role: 'user', content: `[Page: ${page}] [Plan: ${planName}]\n${question}` }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)

    if (response.stop_reason === 'refusal') {
      return json(req, { answer: 'Sorry, I can’t help with that. I can answer questions about using HabitFlow.' })
    }
    const answer = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    return json(req, { answer: answer || 'Sorry, I don’t have an answer for that. Try the Help page.' })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return json(req, { error: 'The assistant is busy right now.', code: 'ai_unavailable' }, 503)
    }
    if (e instanceof Anthropic.APIError) {
      console.error('assistant API error', e.status, e.message)
    } else {
      console.error('assistant error', String(e))
    }
    return json(req, { error: 'The assistant is unavailable right now.', code: 'ai_unavailable' }, 503)
  }
})
