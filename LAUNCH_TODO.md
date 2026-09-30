# Launch to-do

Things only you can do (they need your accounts, money or legal decisions).
Tick them off as you go. Details are in the linked docs.

## Soon
- [ ] Delete the Supabase access token (supabase.com → Account → Access Tokens) and remove the
      `SUPABASE_ACCESS_TOKEN` line from `.env`. Create a new one when you next need database changes.
- [ ] Decide final prices (currently ₹99/month, ₹799/year placeholders) — [MONETIZATION.md](MONETIZATION.md#changing-prices-and-limits)

## Before telling the public
- [ ] Buy a domain and move hosting to Cloudflare Pages (GitHub Pages doesn’t allow commercial sites) — [SETUP.md §9](SETUP.md#9-deploy-the-website)
- [ ] Password reset emails: Resend account + verify your domain + set the secrets — [SETUP.md §4](SETUP.md#4-password-recovery-email)
- [ ] Legal details (`VITE_LEGAL_*`), write a refund policy, have Privacy/Terms reviewed by a lawyer — [PRIVACY_SETUP.md](PRIVACY_SETUP.md)
- [ ] Turn on Supabase leaked-password protection and CAPTCHA for sign-ups — [SECURITY.md](SECURITY.md#known-limitations--to-do)

## To earn money
- [ ] Razorpay account (KYC), create monthly/yearly plans, keys + webhook; test with test keys first — [MONETIZATION.md](MONETIZATION.md#web-payments-razorpay-india)
- [ ] AdSense application (needs the domain) + ad units + `ads.txt` — [MONETIZATION.md](MONETIZATION.md#ads)
- [ ] Donation link (`VITE_SUPPORT_URL`) — optional

## Optional services
- [ ] AI assistant: Anthropic API key — [SETUP.md §7](SETUP.md#7-ai-assistant)
- [ ] Analytics: Plausible or Umami — [SETUP.md §5](SETUP.md#5-analytics-plausible-or-umami)
- [ ] Error tracking: Sentry DSN — [SETUP.md §6](SETUP.md#6-sentry-errors)
- [ ] Forest / café focus sounds: licensed audio files

## Android / Play Store
- [ ] Install the new APK on your phone and test it
- [ ] Everything in [PLAY_STORE_CHECKLIST.md](PLAY_STORE_CHECKLIST.md) (developer account, keystore, listing, Data safety, Play Billing, AdMob)
