/**
 * Client API facade — the ONLY module the frontend imports for deck, scan and
 * enrichment (CONTRACTS §4).
 *
 * The deck path is real. It is deliberately thin: Supabase already provides
 * most of what a deck needs — the `deck_words` view for card data, the
 * `next_new_words` RPC for "what has this learner not seen", a PostgREST
 * upsert for grades, and RLS for access. What is left here is only the part
 * the database cannot do: session assembly, the seeded shuffle, on-device
 * persistence so a session survives the app closing, and German error text.
 *
 * Scan and enrichment are still stubs, marked STUB below.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CEFRLevel } from '../types';
import type {
  DeckCard,
  DeckSession,
  DeckWord,
  Grade,
  Result,
  ScanResponse,
  SRSSnapshot,
  WordEnrichment,
  WordOrigin,
} from '../types/contracts';
import { supabase } from './supabase';
import { toSRSState, type WordProgressRow } from './deck';
import { INITIAL_SRS, isMastered, nextReviewDate, previewIntervals, schedule } from './srs';
import { constrainedShuffle, mulberry32, reinsertIndex } from './shuffle';
import { localISODate } from './localdate';
import { Outbox, type SendResult } from './outbox';
import * as Crypto from 'expo-crypto';

const MAX_SESSION = 30;

const todayISO = () => localISODate();
const sessionKey = (userId: string) => `deck_session:${userId}:${todayISO()}`;

/** Postgres/network failures reach the learner as German, never as a stack trace. */
function germanError(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  if (/fetch|network|timeout|ENOTFOUND/i.test(msg)) return 'Keine Verbindung. Bitte später erneut versuchen.';
  if (/jwt|auth|401/i.test(msg)) return 'Bitte melde dich erneut an.';
  return 'Etwas ist schiefgelaufen. Bitte später erneut versuchen.';
}

function toCard(word: DeckWord, progress: WordProgressRow | undefined): DeckCard {
  const srs: SRSSnapshot = progress ? toSRSState(progress) : { ...INITIAL_SRS };
  return {
    word,
    enrichment: null,
    srs,
    isNew: !progress,
    intervals: previewIntervals(srs),
  };
}

const NOT_READY = 'Noch nicht verfügbar';

function notReady<T>(): Result<T> {
  return { ok: false, error: NOT_READY };
}

// ───────────────────────────────────────────────────────────── deck ──

/** Re-exported from lib/shuffle.ts so the frontend has one import surface. */
export { constrainedShuffle, mulberry32, reinsertIndex } from './shuffle';

/** Cards whose next review has come due, most overdue first. */
async function fetchDue(userId: string, limit: number): Promise<{ cards: DeckCard[]; progress: Map<string, WordProgressRow> }> {
  const { data: rows, error } = await supabase
    .from('word_progress')
    .select('word_id, repetitions, interval_days, ease_factor, lapses, next_review_at, mastered')
    .eq('user_id', userId)
    .eq('mastered', false)
    .lte('next_review_at', todayISO())
    .order('next_review_at', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const progress = new Map<string, WordProgressRow>(
    (rows ?? []).map((r) => [r.word_id as string, r as unknown as WordProgressRow]),
  );
  if (progress.size === 0) return { cards: [], progress };

  const { data: words, error: wordsError } = await supabase
    .from('deck_words')
    .select('*')
    .in('id', [...progress.keys()]);
  if (wordsError) throw wordsError;

  // Preserve the most-overdue-first order the progress query established; the
  // `in` filter above does not guarantee it.
  const byId = new Map((words ?? []).map((w) => [w.id as string, w as DeckWord]));
  const cards: DeckCard[] = [];
  for (const id of progress.keys()) {
    const w = byId.get(id);
    if (w) cards.push(toCard(w, progress.get(id)));
  }
  return { cards, progress };
}

/**
 * Build today's session: everything due, topped up with unseen words at the
 * learner's level, capped at 30. Due cards are the point of an SRS and are
 * never displaced by new material.
 */
export async function buildSession(
  userId: string,
  level: CEFRLevel | CEFRLevel[],
  opts?: { maxCards?: number; seed?: number },
): Promise<Result<DeckSession>> {
  try {
    const maxCards = opts?.maxCards ?? MAX_SESSION;
    const seed = opts?.seed ?? (Date.now() & 0x7fffffff);

    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_new_cards')
      .eq('id', userId)
      .maybeSingle();
    const dailyNew = (profile?.daily_new_cards as number | undefined) ?? 10;

    const { cards: due } = await fetchDue(userId, maxCards);

    // `next_new_words` already excludes anything the learner has progress on,
    // and orders by frequency rank, so the most useful words come first.
    const room = Math.max(0, Math.min(maxCards - due.length, dailyNew));
    let fresh: DeckCard[] = [];
    if (room > 0) {
      const levels = Array.isArray(level) ? level : [level];
      const { data, error } = await supabase.rpc('next_new_words', { p_levels: levels, p_limit: room });
      if (error) throw error;
      fresh = ((data ?? []) as DeckWord[]).map((w) => toCard(w, undefined));
    }

    const queue = constrainedShuffle([...due, ...fresh], (c) => c.isNew, mulberry32(seed));
    const session: DeckSession = {
      id: `${userId}:${todayISO()}:1`,
      seed,
      queue,
      position: 0,
      stats: { due: due.length, new: fresh.length, reviewed: 0 },
    };

    // An empty queue is a successful build, not a failure — the frontend
    // request (docs/agents/status/frontend.md #1) was right that overloading
    // the error channel for "nothing due" made it indistinguishable from a
    // dropped connection except by matching German prose. `queue.length === 0`
    // is a self-describing, typed signal; only persist a session worth resuming.
    if (queue.length > 0) await persist(session, userId);
    return { ok: true, data: session };
  } catch (err) {
    console.warn('buildSession:', err);
    return { ok: false, error: germanError(err) };
  }
}

async function persist(session: DeckSession, userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(sessionKey(userId), JSON.stringify(session));
  } catch (err) {
    // A failed write costs the learner their resume point, not their progress,
    // which is already upserted server-side. Not worth failing the grade over.
    console.warn('session persist failed:', err);
  }
}

/** Today's session, if one was started and not finished. Keyed by user + local day. */
export async function resumeSession(userId: string): Promise<DeckSession | null> {
  try {
    const raw = await AsyncStorage.getItem(sessionKey(userId));
    if (!raw) return null;
    const session = JSON.parse(raw) as DeckSession;
    if (!session?.queue?.length) return null;
    if (session.position >= session.queue.length) return null; // already finished
    return session;
  } catch {
    return null;
  }
}

/** Pure. Reshuffles only the part of the queue the learner has not reached yet. */
export function shuffleRemaining(session: DeckSession, seed?: number): DeckSession {
  const nextSeed = seed ?? ((session.seed + 1) >>> 0);
  const done = session.queue.slice(0, session.position);
  const remaining = constrainedShuffle(
    session.queue.slice(session.position),
    (c) => c.isNew,
    mulberry32(nextSeed),
  );
  return { ...session, seed: nextSeed, queue: [...done, ...remaining] };
}

/**
 * Grade the current card: schedule it forward, persist, and advance.
 *
 * Grade 0 ("Nochmal") re-inserts the card 3-5 places later so it comes back
 * this session (F3.3). The upsert is fire-and-forget against the network: a
 * learner on a train should never be blocked from continuing, and
 * `next_review_at` is recomputed from the card's own state on the next build.
 */
export async function gradeCard(session: DeckSession, grade: Grade): Promise<DeckSession> {
  const card = session.queue[session.position];
  if (!card) return session;

  const next = schedule(card.srs, grade);
  const userId = session.id.split(':')[0];

  // Persist the grade BEFORE anything is sent. If the app dies or the network
  // is down, the grade is still in the outbox and goes out on the next flush.
  await outboxFor(userId).enqueue(Crypto.randomUUID(), {
    wordId: card.word.id,
    grade,
    level: card.word.level,
    origin: card.word.origin,
    reviewedAt: new Date().toISOString(),
    repetitions: next.repetitions,
    intervalDays: next.intervalDays,
    easeFactor: next.easeFactor,
    lapses: next.lapses,
    nextReview: nextReviewDate(next.intervalDays),
    mastered: isMastered(next),
  });
  // Fire-and-forget: the learner keeps going, and a failure stays queued.
  void flushReviews(userId);

  const queue = [...session.queue];
  const graded: DeckCard = { ...card, srs: next, intervals: previewIntervals(next) };
  queue[session.position] = graded;

  if (grade === 0) {
    const [removed] = queue.splice(session.position, 1);
    const at = reinsertIndex(session.position, queue.length, mulberry32(session.seed + session.position));
    queue.splice(at, 0, removed);
  }

  const advanced: DeckSession = {
    ...session,
    queue,
    // On "Nochmal" the card moved away from this index, so the next card has
    // already slid into it: do not advance, or it would be skipped.
    position: grade === 0 ? session.position : session.position + 1,
    stats: { ...session.stats, reviewed: session.stats.reviewed + 1 },
  };

  await persist(advanced, userId);
  return advanced;
}

/** Add words to the deck due today, without disturbing cards already in progress. */
export async function addToDeck(
  userId: string,
  wordIds: string[],
  via: 'level' | 'scan' | 'manual',
): Promise<Result<number>> {
  if (wordIds.length === 0) return { ok: true, data: 0 };
  try {
    const { data: existing, error: readError } = await supabase
      .from('word_progress')
      .select('word_id')
      .eq('user_id', userId)
      .in('word_id', wordIds);
    if (readError) throw readError;

    const have = new Set((existing ?? []).map((r) => r.word_id as string));
    const additions = wordIds.filter((id) => !have.has(id));
    if (additions.length === 0) return { ok: true, data: 0 };

    const { error } = await supabase.from('word_progress').insert(
      additions.map((word_id) => ({
        user_id: userId,
        word_id,
        language: 'de',
        added_via: via,
        next_review_at: todayISO(),
      })),
    );
    if (error) throw error;
    return { ok: true, data: additions.length };
  } catch (err) {
    console.warn('addToDeck:', err);
    return { ok: false, error: germanError(err) };
  }
}

// ─────────────────────────────────────────────────────── enrichment ──

/** STUB — backend: `word-ai` Edge Function, cached per word id. */
export async function getEnrichment(wordId: string): Promise<Result<WordEnrichment>> {
  void wordId;
  return notReady<WordEnrichment>();
}

/** STUB — backend: fire-and-forget warm-up with in-memory de-dupe. No-op for now. */
export function prefetchEnrichment(wordIds: string[]): void {
  void wordIds;
}

// ───────────────────────────────────────────────────────────── scan ──

/**
 * STUB — backend: expo-image-manipulator, long edge ≤1600px, JPEG 0.7, base64.
 * Returns an empty string for now so the capture flow still reaches `scanPages`
 * and the frontend can see its error state.
 */
export async function preparePage(uri: string): Promise<string> {
  void uri;
  return '';
}

/** STUB — backend: `scan-words` Edge Function, 1–5 pages in one call. */
export async function scanPages(
  imagesBase64: string[],
  level: CEFRLevel,
): Promise<Result<ScanResponse>> {
  void imagesBase64;
  void level;
  return notReady<ScanResponse>();
}

/** STUB — backend: `import-scan` Edge Function, idempotent. */
export async function importScan(
  scanId: string,
  keys: string[],
): Promise<Result<{ imported: number; word_ids: string[] }>> {
  void scanId;
  void keys;
  return notReady<{ imported: number; word_ids: string[] }>();
}

// ────────────────────────────────────────────────────────── profile ──

/** STUB — backend: update profiles.daily_new_cards (1–50). */
export async function updateDailyNewCards(userId: string, n: number): Promise<Result<void>> {
  void userId;
  void n;
  return notReady<void>();
}

// ─────────────────────────────────────────────────────────── outbox ──

type ReviewEvent = {
  wordId: string;
  grade: Grade;
  level: CEFRLevel;
  origin: WordOrigin;
  reviewedAt: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lapses: number;
  nextReview: string;
  mastered: boolean;
};

const outboxes = new Map<string, Outbox<ReviewEvent>>();

/** One outbox per learner, so one account's queue is never sent under another. */
function outboxFor(userId: string): Outbox<ReviewEvent> {
  let box = outboxes.get(userId);
  if (!box) {
    box = new Outbox<ReviewEvent>({
      storage: AsyncStorage,
      key: `review_outbox:${userId}`,
    });
    outboxes.set(userId, box);
  }
  return box;
}

/**
 * Classify a server error. Data-shape problems (SQLSTATE classes 22, 23, 42)
 * will never succeed on retry, so they are dropped and reported. Everything else
 * (network, expired session, server trouble) is kept and retried.
 */
function classify(error: { code?: string; message?: string }): SendResult {
  const code = error.code ?? '';
  const permanent = /^(22|23|42)/.test(code);
  return permanent
    ? { ok: false, retryable: false, reason: code }
    : { ok: false, retryable: true, reason: error.message ?? 'unknown' };
}

/** Send every queued review. Safe to call often; concurrent calls share one run. */
export async function flushReviews(userId: string): Promise<void> {
  try {
    const report = await outboxFor(userId).flush(async (item) => {
      const e = item.payload;
      const { data, error } = await supabase.rpc('record_review', {
        p_event_id: item.id,
        p_word_id: e.wordId,
        p_grade: e.grade,
        p_level: e.level,
        p_origin: e.origin,
        p_reviewed_at: e.reviewedAt,
        p_repetitions: e.repetitions,
        p_interval_days: e.intervalDays,
        p_ease_factor: e.easeFactor,
        p_lapses: e.lapses,
        p_next_review: e.nextReview,
        p_mastered: e.mastered,
      });
      if (error) return classify(error);
      // `recorded: false` means the server already has this event: success.
      void data;
      return { ok: true };
    });
    if (report.dropped.length) {
      console.warn('[reviews] permanently rejected, dropped:', report.dropped);
    }
  } catch (err) {
    console.warn('[reviews] flush failed, will retry:', err);
  }
}

/** Grades still waiting to reach the server. For the UI and for tests. */
export async function pendingReviewCount(userId: string): Promise<number> {
  return outboxFor(userId).size();
}

// ─────────────────────────────────────────────────────────── reads ──

export type LevelCount = { total: number; estimated: number };

/**
 * Catalogue size per level, counted by the server so it is correct beyond
 * PostgREST's 1,000-row cap. Counts only words the deck serves.
 */
export async function countByLevel(): Promise<Result<Record<CEFRLevel, LevelCount>>> {
  const { data, error } = await supabase.rpc('level_counts');
  if (error) return { ok: false, error: germanError(error) };
  const out = {} as Record<CEFRLevel, LevelCount>;
  for (const row of (data ?? []) as { level: CEFRLevel; total: number; estimated: number }[]) {
    out[row.level] = { total: Number(row.total), estimated: Number(row.estimated) };
  }
  return { ok: true, data: out };
}

export type LevelProgress = {
  level: CEFRLevel;
  total: number;
  introduced: number;
  due: number;
  mastered: number;
};

/** Per-level progress for the signed-in learner, judged against the device's date. */
export async function levelProgress(): Promise<Result<LevelProgress[]>> {
  const { data, error } = await supabase.rpc('level_progress', { p_today: localISODate() });
  if (error) return { ok: false, error: germanError(error) };
  const rows = ((data ?? []) as LevelProgress[]).map((r) => ({
    level: r.level,
    total: Number(r.total),
    introduced: Number(r.introduced),
    due: Number(r.due),
    mastered: Number(r.mastered),
  }));
  return { ok: true, data: rows };
}

/** The next day anything becomes due, or null when nothing is scheduled. */
export async function nextDueAt(): Promise<Result<string | null>> {
  const { data, error } = await supabase.rpc('next_due_at', { p_today: localISODate() });
  if (error) return { ok: false, error: germanError(error) };
  return { ok: true, data: (data as string | null) ?? null };
}

export type ThemeSummary = { thema: string; total: number; started: number; due: number };

/** Per-theme totals for one level, computed by the server (migration 012). */
export async function levelThemes(level: CEFRLevel | CEFRLevel[]): Promise<Result<ThemeSummary[]>> {
  const { data, error } = await supabase.rpc('level_themes', {
    p_levels: Array.isArray(level) ? level : [level],
    p_today: localISODate(),
  });
  if (error) return { ok: false, error: germanError(error) };
  return {
    ok: true,
    data: ((data ?? []) as ThemeSummary[]).map((r) => ({
      thema: r.thema,
      total: Number(r.total),
      started: Number(r.started),
      due: Number(r.due),
    })),
  };
}

/** Words due today for the signed-in learner, most overdue first, capped for display. */
export async function dueWords(limit = 200): Promise<Result<DeckWord[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('word_progress')
      .select('word_id, next_review_at')
      .eq('mastered', false)
      .lte('next_review_at', localISODate())
      .order('next_review_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.word_id as string);
    if (ids.length === 0) return { ok: true, data: [] };

    const { data: words, error: wordsError } = await supabase
      .from('deck_words')
      .select('*')
      .in('id', ids);
    if (wordsError) throw wordsError;

    const byId = new Map((words ?? []).map((w) => [w.id as string, w as DeckWord]));
    return { ok: true, data: ids.map((id) => byId.get(id)).filter((w): w is DeckWord => !!w) };
  } catch (err) {
    console.warn('dueWords:', err);
    return { ok: false, error: germanError(err) };
  }
}
