# Privacy setup

What to configure so the Privacy Policy, Terms and consent banner match reality.
The generated texts are a starting point, **not legal advice**. Have them reviewed by a
qualified lawyer for your country before a public launch.

## 1. Fill in legal details (never invented by the app)

| Variable | Example | Shown on |
| --- | --- | --- |
| `VITE_LEGAL_BUSINESS_NAME` | your name or registered business | Privacy, Terms, footer |
| `VITE_LEGAL_CONTACT_EMAIL` | privacy@your-domain | Privacy, Terms, footer “Contact” |
| `VITE_LEGAL_COUNTRY` | India | Privacy, Terms (governing law) |
| `VITE_LEGAL_EFFECTIVE_DATE` | 1 October 2026 | both pages |
| `VITE_LEGAL_DATA_REGION` | Japan (Tokyo) | Privacy (Supabase region is ap-northeast-1) |
| `VITE_HOSTING_PROVIDER` | GitHub Pages / Cloudflare Pages | Privacy |
| `VITE_EMAIL_PROVIDER` | Resend | Privacy (only once configured) |
| `VITE_AI_PROVIDER` | anthropic | Privacy (only once the key is set) |
| `VITE_LEGAL_MIN_AGE` | 13 (or 16/18 depending on your rules) | Privacy, Terms |
| `VITE_LEGAL_REVIEWED` | true — only after legal review | hides the “Draft” notice |

Missing values show as red “[… — not configured]” placeholders so nothing is guessed.
The Terms also contain a placeholder for your **refund policy** — decide it and edit
`src/pages/LegalPages.tsx`.

## 2. Services are disclosed only when used

The Privacy page lists Supabase and your host always, and each of these only when its
setting is present: Plausible/Umami, Sentry, AdSense, Razorpay, Google Play, email
provider, AI provider. Keep the variables in sync with what you actually run.

## 3. Consent

- Banner appears only if analytics or ads are configured.
- `VITE_CONSENT_MODE=all` (default): everyone is asked before optional technologies load.
- `VITE_CONSENT_MODE=regional`: visitors in EEA/UK/Swiss time zones are asked; others
  start opted in and can opt out in Cookie Settings. Check this against the laws that
  apply to your users (e.g. India’s DPDP Act) before using it.
- Choices are stored on the device (`localStorage`, key `habitflow-consent`) with a
  version number; bump `version` in `src/config/consent.ts` when you add providers so
  everyone is asked again.
- “Cookie Settings” is in every footer and in Settings → Privacy.

## 4. Data minimisation checklist

- Analytics: allow-listed events, no personal properties, paths without query strings.
- Sentry: no user info, cookies, headers, bodies, query strings; scrubbing in `beforeSend`.
- AI: question + page + plan only.
- Friends: daily totals only, sharing switch, leaderboard opt-in.
- Recovery email is optional and stored separately from app data.

## 5. Before launch

- [ ] Legal variables set and texts reviewed by a lawyer; refund policy written
- [ ] Contact email monitored
- [ ] If you target the EU/UK: consider a DPO/representative requirements, a certified CMP for AdSense
- [ ] Data processing agreements accepted with Supabase, Resend, Sentry, analytics, payment providers
- [ ] Children: decide minimum age; don’t market to children below it
- [ ] Play Console “Data safety” form matches the Privacy Policy (see PLAY_STORE_CHECKLIST.md)
