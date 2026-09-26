import { supabase } from './supabase';
import { SRSState, Grade, schedule, nextReviewDate, xpForGrade, isMastered, INITIAL_SRS } from './srs';
import { CEFRLevel, Word } from '../types';

/** Deck persistence. PRD v2 D2: every card the learner meets is a row in
 *  `word_progress` — the database is the record of truth, not AsyncStorage, so
 *  a reinstall or a second device sees the same deck. */

export interface WordProgressRow {
  word_id: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  lapses: number;
  next_review_at: string;
  mastered: boolean;
  correct_count: number;
  incorrect_count: number;
  last_grade: number | null;
}

export function toSRSState(row: WordProgressRow | undefined): SRSState {
  if (!row) return INITIAL_SRS;
  return {
    repetitions: row.repetitions,
    intervalDays: row.interval_days,
    // A row written before the four-grade migration has the column default.
    easeFactor: Number(row.ease_factor) || INITIAL_SRS.easeFactor,
    lapses: row.lapses,
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Every card this user has started, keyed by word id. */
export async function fetchProgress(userId: string): Promise<Map<string, WordProgressRow>> {
  const { data, error } = await supabase
    .from('word_progress')
    .select('word_id, repetitions, interval_days, ease_factor, lapses, next_review_at, mastered, correct_count, incorrect_count, last_grade')
    .eq('user_id', userId);

  if (error || !data) {
    console.warn('fetchProgress error:', error?.message);
    return new Map();
  }
  return new Map(data.map(row => [row.word_id, row as WordProgressRow]));
}

/** Word ids due today or overdue. */
export async function fetchDueWordIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('word_progress')
    .select('word_id')
    .eq('user_id', userId)
    .lte('next_review_at', todayISO());

  if (error || !data) {
    console.warn('fetchDueWordIds error:', error?.message);
    return [];
  }
  return data.map(r => r.word_id as string);
}

/** Build a review session: cards already due first, then unseen words at the
 *  user's level to top the session up. Due cards are the point of an SRS, so
 *  they are never displaced by new material. */
export function buildSession(
  words: Word[],
  progress: Map<string, WordProgressRow>,
  level: CEFRLevel,
  size = 12,
): Word[] {
  const today = todayISO();
  const byId = new Map(words.map(w => [w.id, w]));

  const due: Word[] = [];
  for (const [wordId, row] of progress) {
    const word = byId.get(wordId);
    if (word && row.next_review_at <= today && !row.mastered) due.push(word);
  }

  const fresh = words.filter(w => w.level === level && !progress.has(w.id));

  return [...due, ...fresh].slice(0, size);
}

/** Persist one grade. Returns the XP earned so the caller can report it. */
export async function gradeCard(
  userId: string,
  wordId: string,
  current: SRSState,
  grade: Grade,
): Promise<{ next: SRSState; xp: number }> {
  const next = schedule(current, grade);
  const xp = xpForGrade(grade);

  const { error } = await supabase.from('word_progress').upsert({
    user_id: userId,
    word_id: wordId,
    language: 'de',
    repetitions: next.repetitions,
    interval_days: next.intervalDays,
    ease_factor: next.easeFactor,
    lapses: next.lapses,
    last_grade: grade,
    next_review_at: nextReviewDate(next.intervalDays),
    mastered: isMastered(next),
    last_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,word_id' });

  if (error) console.warn('gradeCard error:', error.message);

  return { next, xp };
}

/** Bulk-add words to the deck without scheduling them forward — used by the
 *  scan importer. Existing cards are left alone so an import cannot reset
 *  progress the learner already has. */
export async function addToDeck(userId: string, wordIds: string[]): Promise<number> {
  if (wordIds.length === 0) return 0;

  const existing = await fetchProgress(userId);
  const additions = wordIds.filter(id => !existing.has(id));
  if (additions.length === 0) return 0;

  const { error } = await supabase.from('word_progress').insert(
    additions.map(word_id => ({
      user_id: userId,
      word_id,
      language: 'de',
      next_review_at: todayISO(),
    })),
  );

  if (error) {
    console.warn('addToDeck error:', error.message);
    return 0;
  }
  return additions.length;
}
