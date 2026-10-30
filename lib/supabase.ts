import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export type Profile = {
  id: string;
  display_name: string | null;
  language: string;
  cefr_level: string;
  /** Selected levels, e.g. ['A1','B1']. Source of truth for the deck (migration 013). */
  levels: string[];
  /** Interface language saved to the account. null until the learner has chosen one (migration 015). */
  ui_lang: 'de' | 'en' | null;
  /** When the learner agreed to send scanned photos for word extraction. null = not agreed. */
  scan_consent_at: string | null;
  /** When the learner agreed to session replay (migration 022). null = not agreed. */
  replay_consent_at: string | null;
  /** When the session tracking question was answered (migration 023). Set whatever the answer. */
  session_tracking_asked_at: string | null;
  /** When the first-run tour was finished (migration 024). null = not finished. */
  tour_completed_at: string | null;
  xp: number;
  streak: number;
  last_active_date: string | null;
  onboarding_complete: boolean;
};
