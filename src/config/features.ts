/**
 * Feature keys and their display labels.
 *
 * Which plan includes which feature, the limits (trackers, friends, history)
 * and the prices are NOT here: they live in the `plans` table in Supabase so
 * they can be changed without a new release, and the database enforces them.
 * See MONETIZATION.md → "Changing prices and limits".
 */
export type Feature =
  | 'basic_statistics'
  | 'unlimited_trackers'
  | 'advanced_statistics'
  | 'full_history'
  | 'custom_themes'
  | 'focus_sounds'
  | 'csv_export'
  | 'pdf_export'
  | 'reports'
  | 'leaderboards'
  | 'friend_groups'
  | 'no_ads'

export type LimitKey = 'trackers' | 'friends' | 'history_days'

export const FEATURE_LABELS: Record<Feature, string> = {
  basic_statistics: 'Progress statistics and charts',
  unlimited_trackers: 'Unlimited trackers',
  advanced_statistics: '90-day and all-time statistics',
  full_history: 'Full history',
  custom_themes: 'Custom colour themes',
  focus_sounds: 'Focus sounds (rain, white noise…)',
  csv_export: 'CSV export',
  pdf_export: 'PDF progress reports',
  reports: 'Study & productivity reports',
  leaderboards: 'Weekly friend leaderboards',
  friend_groups: 'Friend groups (coming soon)',
  no_ads: 'No advertisements',
}

/** Shown in the upgrade dialog when a feature is locked. */
export const FEATURE_UPSELL: Partial<Record<Feature | LimitKey, string>> = {
  trackers: 'You’ve reached the free tracker limit. Upgrade to Pro for unlimited trackers.',
  friends: 'You’ve reached the free friend limit. Upgrade to Pro to add more friends.',
  history_days: 'Longer history is a Pro feature.',
  advanced_statistics: '90-day and all-time statistics are a Pro feature.',
  csv_export: 'PDF/CSV export is a Pro feature.',
  pdf_export: 'PDF/CSV export is a Pro feature.',
  custom_themes: 'Custom themes are a Pro feature.',
  focus_sounds: 'Focus sounds are a Pro feature.',
  leaderboards: 'Leaderboards are a Pro feature.',
}
