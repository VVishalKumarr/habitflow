import { env, envFlag } from './env'

/**
 * Legal details shown on the Privacy Policy and Terms pages.
 * Nothing is invented: empty fields render as clearly marked placeholders.
 * Set these before public launch and have the texts reviewed by a lawyer.
 */
export const legalConfig = {
  businessName: env('VITE_LEGAL_BUSINESS_NAME'),
  contactEmail: env('VITE_LEGAL_CONTACT_EMAIL'),
  country: env('VITE_LEGAL_COUNTRY'),
  effectiveDate: env('VITE_LEGAL_EFFECTIVE_DATE'),
  /** Set to true once a legal professional has reviewed the texts; hides the draft notice. */
  reviewed: envFlag('VITE_LEGAL_REVIEWED'),
  /** Where the database is hosted, e.g. "Japan (Tokyo)". */
  dataRegion: env('VITE_LEGAL_DATA_REGION'),
  /** Who hosts the website, e.g. "GitHub Pages" or "Cloudflare Pages". */
  hostingProvider: env('VITE_HOSTING_PROVIDER'),
  /** Transactional email provider actually configured on the server, e.g. "Resend". */
  emailProvider: env('VITE_EMAIL_PROVIDER'),
  /** Minimum age to use the service (Terms). */
  minimumAge: Number(env('VITE_LEGAL_MIN_AGE', '13')),
}

export const legalComplete = () =>
  Boolean(legalConfig.businessName && legalConfig.contactEmail && legalConfig.country && legalConfig.effectiveDate)
