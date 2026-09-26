import AsyncStorage from '@react-native-async-storage/async-storage';
import { CEFRLevel } from '../types';

/** Local, device-only progress. Supabase holds the vocabulary; this holds what
 *  the learner has done with it.
 *
 *  Several fields here are not tracked by any screen yet — `minutesToday` and
 *  `kapitel` are read by Home (§6.1) and are deliberately zero until something
 *  writes them. §6.1: return zeroes rather than faking values.
 *
 *  `srs` is the shared review state that hooks/useSRS.ts will own (§6.4). It is
 *  declared here so the deck screen persists under this same key rather than
 *  inventing a second one.
 */
export const PROGRESS_KEY = 'local_progress_v1';

export interface SRSCard {
  /** ISO date (yyyy-mm-dd) this card next comes up. */
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export interface KapitelProgress {
  done: number;
  total: number;
}

export interface LocalProgress {
  level: CEFRLevel;
  streakDays: number;
  xp: number;
  /** Minutes studied today. Not yet tracked by any screen — see note above. */
  minutesToday: number;
  /** ISO date of the last session, used to expire `minutesToday` and the streak. */
  lastStudiedAt: string | null;
  /** Keyed by Word.category. Empty until a screen writes to it. */
  kapitel: Record<string, KapitelProgress>;
  /** Keyed by Word.id. Empty until useSRS exists. */
  srs: Record<string, SRSCard>;
}

export const EMPTY_PROGRESS: LocalProgress = {
  level: 'A1',
  streakDays: 0,
  xp: 0,
  minutesToday: 0,
  lastStudiedAt: null,
  kapitel: {},
  srs: {},
};

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** XP needed per Stufe. The design shows "STUFE n" beside the XP stat but does
 *  not specify the curve; this is a flat rate, defined in one place so the
 *  Home and Progress screens cannot disagree about it. */
export const XP_PER_STUFE = 500;

export function stufe(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_STUFE) + 1;
}

/** The daily study target the Home ring fills against (§6.1: minutes/15). */
export const DAILY_MINUTES_GOAL = 15;

/** Merged against EMPTY_PROGRESS so a stored blob written by an older build is
 *  still readable after new fields are added. */
export async function loadProgress(): Promise<LocalProgress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const stored = JSON.parse(raw) as Partial<LocalProgress>;
    const merged: LocalProgress = { ...EMPTY_PROGRESS, ...stored };
    // Minutes are per-day: a stale value from a previous day reads as zero.
    if (merged.lastStudiedAt !== todayISO()) merged.minutesToday = 0;
    return merged;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function saveProgress(progress: LocalProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Progress write failed:', err);
  }
}

/** Cards whose next review is today or overdue. Zero until useSRS populates srs. */
export function dueCount(progress: LocalProgress): number {
  const today = todayISO();
  return Object.values(progress.srs).filter(card => card.nextReviewAt <= today).length;
}

/** Ids of the cards due now, so Home can list them without duplicating the rule. */
export function dueWordIds(progress: LocalProgress): string[] {
  const today = todayISO();
  return Object.entries(progress.srs)
    .filter(([, card]) => card.nextReviewAt <= today)
    .map(([id]) => id);
}
