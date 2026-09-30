import { env } from './env'

/** Where ads may appear. Never on the timer, task check-offs, account flows or error states. */
export type AdPlacement = 'progress' | 'friends' | 'help'

export const adsConfig = {
  /** Google AdSense publisher id, e.g. ca-pub-1234567890123456. Empty = no web ads. */
  adsenseClientId: env('VITE_ADSENSE_CLIENT_ID'),
  /** One AdSense ad unit (slot id) per placement. A placement without a slot never shows an ad. */
  slots: {
    progress: env('VITE_ADSENSE_SLOT_PROGRESS'),
    friends: env('VITE_ADSENSE_SLOT_FRIENDS'),
    help: env('VITE_ADSENSE_SLOT_HELP'),
  } satisfies Record<AdPlacement, string>,
  /** Google AdMob app id for Android (not integrated yet; see MONETIZATION.md). */
  admobAppId: env('VITE_ADMOB_APP_ID'),
}
