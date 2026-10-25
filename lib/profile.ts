import AsyncStorage from '@react-native-async-storage/async-storage';
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

/** The learner's selected levels, in CEFR order. Never empty. */
export function levelsOf(profile: Profile | null): CEFRLevel[] {
  const chosen = new Set((profile?.levels ?? []).map(toCEFRLevel));
  const ordered = LEVELS.filter((l) => chosen.has(l));
  return ordered.length > 0 ? ordered : [levelOf(profile)];
}

/** Drop today's cached deck sessions. A cached queue was built for the old levels,
 *  so resuming it after a level change would show cards the learner no longer chose. */
async function clearDeckSessions(userId: string): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(`deck_session:${userId}:`));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // Not fatal: a stale session expires at midnight anyway.
  }
}

/** Replace the learner's selected levels. Progress is untouched (F2.4). */
export async function updateLevels(userId: string, levels: CEFRLevel[]): Promise<{ error?: string }> {
  const ordered = LEVELS.filter((l) => levels.includes(l));
  if (ordered.length === 0) return { error: 'Wähle mindestens ein Niveau.' };

  const { error } = await supabase
    .from('profiles')
    .update({ levels: ordered, cefr_level: ordered[0] })
    .eq('id', userId);
  if (error) return { error: error.message };

  await clearDeckSessions(userId);
  return {};
}

export async function updateLevel(userId: string, level: CEFRLevel): Promise<{ error?: string }> {
  return updateLevels(userId, [level]);
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
  levels: CEFRLevel | CEFRLevel[],
  displayName?: string,
): Promise<{ error?: string }> {
  const list = (Array.isArray(levels) ? levels : [levels]);
  const ordered = LEVELS.filter((l) => list.includes(l));
  if (ordered.length === 0) return { error: 'Wähle mindestens ein Niveau.' };

  const patch: Record<string, unknown> = {
    levels: ordered,
    cefr_level: ordered[0],
    onboarding_complete: true,
  };
  const trimmed = displayName?.trim();
  if (trimmed) patch.display_name = trimmed;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  return error ? { error: error.message } : {};
}
