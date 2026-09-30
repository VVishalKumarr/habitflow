import { env } from './env'

/**
 * 'all'      – ask everyone before loading analytics or ads (safest default).
 * 'regional' – ask visitors whose time zone is in the EEA, UK or Switzerland;
 *              elsewhere optional categories start enabled but can be turned
 *              off any time in Cookie Settings. Check this against the laws
 *              that apply to you before switching.
 */
export const consentConfig = {
  mode: (env('VITE_CONSENT_MODE', 'all') === 'regional' ? 'regional' : 'all') as 'all' | 'regional',
  /** Bump when the categories or providers change so everyone is asked again. */
  version: 1,
}
