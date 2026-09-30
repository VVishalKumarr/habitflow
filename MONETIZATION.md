# Monetization

Free + Pro subscriptions, ads for free users, and an optional donation link.
Nothing here charges anyone until you configure a provider.

## Plans

| | Free | Pro |
| --- | --- | --- |
| Trackers | 2 | unlimited |
| Detailed history / charts | 30 days | full, 90-day views |
| Friends (incl. sent requests) | 3 | 50 |
| Colour themes, focus sounds, CSV/PDF reports, leaderboards | — | ✓ |
| Ads | yes (with consent) | none |
| Price | ₹0 | ₹99/month or ₹799/year (placeholders) |
| Free trial | — | 7 days, once per account |

## Changing prices and limits

Everything lives in the `plans` table (prices in paise). Examples (SQL Editor):

```sql
-- prices
update public.plans set price_monthly = 14900, price_yearly = 119900 where id = 'pro';
-- free tracker limit 3, Pro friends unlimited
update public.plans set limits = jsonb_set(limits, '{trackers}', '3') where id = 'free';
update public.plans set limits = jsonb_set(limits, '{friends}', 'null') where id = 'pro';
-- trial length (0 = no trial)
update public.plans set trial_days = 14 where id = 'pro';
-- add/remove a Pro feature
update public.plans set features = array_remove(features, 'focus_sounds') where id = 'pro';
```

The pricing page, limits and checks update immediately; no redeploy needed. Feature
labels are in `src/config/features.ts`. If you change a price, create the matching new
plan in Razorpay/Play too (next sections).

## Subscription states

`FREE` (never paid) · `TRIAL` · `PRO` · `EXPIRED` (had Pro, now free). Computed by
`my_entitlements()` from the `subscriptions` table. Cancelling keeps Pro until
`expires_at`. Losing Pro never deletes data.

## Web payments: Razorpay (India)

1. Create a Razorpay account and complete KYC.
2. Dashboard → Subscriptions → **Plans**: create a monthly and a yearly plan with your
   prices. Copy their `plan_…` ids into the database:
   ```sql
   update public.plans set razorpay_plan_monthly = 'plan_xxx', razorpay_plan_yearly = 'plan_yyy' where id = 'pro';
   ```
3. Settings → API Keys: generate keys.
   - Server secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
   - Website: `VITE_PAYMENT_PROVIDER=razorpay`, `VITE_RAZORPAY_KEY_ID=rzp_live_…` (the key id is public)
4. Settings → Webhooks: URL
   `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`, events
   `subscription.*`, a secret → server secret `RAZORPAY_WEBHOOK_SECRET`.
5. Test with Razorpay **test** keys first; then switch to live keys.

Flow: *Upgrade* → `billing` creates the subscription server-side → Razorpay Checkout →
`billing` verifies the signature and asks Razorpay for the real status → webhook keeps it
in sync (renewals, failures, cancellation). Users cancel from the Pro page.

## Stripe / Lemon Squeezy (international, future)

The provider layer (`src/lib/payments/`) and the `subscriptions.provider` column already
support them. To add one: implement a provider in `src/lib/payments/` (checkout +
cancel), a server function that creates checkout sessions, and a signed webhook that
upserts `subscriptions` (mirror `billing` + `razorpay-webhook`). Lemon Squeezy acts as
merchant of record and handles international sales tax for you.

## Android: Google Play Billing

Google Play requires digital subscriptions sold in the app to use Play Billing, so the
Android app never shows the web checkout (it shows “not available in the app yet”).
To enable:

1. Play Console → Monetize → Subscriptions: create `habitflow_pro` with monthly/yearly
   base plans. `update public.plans set google_play_product_id = 'habitflow_pro' where id='pro';`
   and `VITE_GOOGLE_PLAY_PRODUCT_ID=habitflow_pro`.
2. Google Cloud: service account with access to the Play Developer API; grant it
   “View financial data / Manage orders” in Play Console → Users & permissions. Put its
   JSON (one line) in `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, and set `GOOGLE_PLAY_PACKAGE_NAME`.
3. Add a billing plugin (e.g. `cordova-plugin-purchase` or RevenueCat Capacitor) and
   implement `src/lib/payments/googlePlay.ts` (steps are in that file): purchase with
   `obfuscatedAccountId = user id`, send the token to `google-play-verify`.
4. For renewals/cancellations, add Real-time Developer Notifications (Pub/Sub) pointing
   to a function that re-verifies the token (same logic as `google-play-verify`).

A subscription bought on the web also unlocks Pro in the app (same account).

## Ads

**Web — Google AdSense**
1. Apply at adsense.google.com with your own domain (AdSense usually rejects app-only
   sites; the public landing and Help pages help).
2. Create one display ad unit per placement and set:
   `VITE_ADSENSE_CLIENT_ID=ca-pub-…`, `VITE_ADSENSE_SLOT_PROGRESS`, `…_FRIENDS`, `…_HELP`.
3. In the EEA/UK, Google requires a **Google-certified consent platform (CMP)**. The
   built-in banner controls whether ads load at all; for EEA traffic add a certified
   CMP (e.g. Google’s own Privacy & messaging) before enabling ads there.
4. Add `ads.txt` to `public/` with the line AdSense gives you.

Placements are `<AdSlot placement="progress" | "friends" | "help" />`. The component
renders nothing unless AdSense is configured, the slot exists, advertising consent was
given, the platform is web and the user isn’t Pro. Never used on the timer, check-offs,
account/password pages or error screens.

**Android — AdMob:** not integrated. Adding an AdMob plugin requires the AdMob app id in
the Android manifest (the app crashes on start without it), so it’s left out until you
have an AdMob account: install `@capacitor-community/admob`, add the app id meta-data,
implement an AdMob branch in `AdSlot`, and use Google’s UMP consent SDK.

## Donations

Set `VITE_SUPPORT_URL` (Buy Me a Coffee, Ko-fi, or a UPI payment page) and optionally
`VITE_SUPPORT_LABEL`. The link appears in the footer, the landing page and Settings;
hidden when empty. Google Play has rules about donations in apps — check them before
showing it in the Android build.

## Analytics for revenue

Events `upgrade_clicked` (with `source`), `trial_started`, `subscription_started`
(with `interval`, `provider`) let you see which upgrade prompts work.
