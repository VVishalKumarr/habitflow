import { env, envFlag } from './env'

export const aiConfig = {
  /** Show the assistant button. Without a server-side AI key it answers from the built-in help articles. */
  assistantEnabled: envFlag('VITE_ASSISTANT_ENABLED', true),
  /**
   * The AI provider actually configured on the server ('anthropic' or empty).
   * Only used to disclose the provider in the Privacy Policy — set it when you
   * add ANTHROPIC_API_KEY to the Supabase function secrets.
   */
  provider: env('VITE_AI_PROVIDER'),
}
