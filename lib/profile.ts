import { supabase, Profile } from './supabase';
import { CEFRLevel } from '../types';

/** Profile is the single source of truth for the user's CEFR level (PRD v2 D1).
 *  Nothing else in the app may hold its own level state. */

const LEVELS: readonly CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** `profiles.cefr_level` is a plain `text` column, so a bad value is possible.
 *  Narrow it once here rather than casting at each call site. */
export function toCEFRLevel(value: string | null | undefined): CEFRLevel {
  return LEVELS.includes(value as CEFRLevel) ? (value as CEFRLevel) : 'A1';
}

export function levelOf(profile: Profile | null): CEFRLevel {
  return toCEFRLevel(profile?.cefr_level);
}

export async function updateLevel(userId: string, level: CEFRLevel): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ cefr_level: level })
    .eq('id', userId);
  return error ? { error: error.message } : {};
}

export async function updateDisplayName(userId: string, name: string): Promise<{ error?: string }> {
  const trimmed = name.trim();
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed.length > 0 ? trimmed : null })
    .eq('id', userId);
  return error ? { error: error.message } : {};
}

/** Marks profile creation done. Called at the end of level selection so the app
 *  knows not to send this user through setup again. */
export async function completeOnboarding(
  userId: string,
  level: CEFRLevel,
  displayName?: string,
): Promise<{ error?: string }> {
  const patch: Record<string, unknown> = {
    cefr_level: level,
    onboarding_complete: true,
  };
  const trimmed = displayName?.trim();
  if (trimmed) patch.display_name = trimmed;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  return error ? { error: error.message } : {};
}
