/**
 * Client API facade — the ONLY module the frontend imports for deck, scan and
 * enrichment (CONTRACTS §4).
 *
 * Bootstrap state: these are stubs. Async functions that return `Result`
 * resolve to `{ ok: false, error: 'Noch nicht verfügbar' }`; pure functions do
 * the simplest correct thing. The frontend builds against these immediately and
 * the screens light up when agent/backend merges.
 *
 * BACKEND agent: replace every body — usually by delegating to lib/deck.ts,
 * lib/shuffle.ts, lib/ocr.ts, lib/ai.ts, which you may restructure freely.
 * Never change a signature in this file. Anything marked STUB below is yours.
 */
import type { CEFRLevel } from '../types';
import type {
  DeckSession,
  Grade,
  Result,
  ScanResponse,
  WordEnrichment,
} from '../types/contracts';

const NOT_READY = 'Noch nicht verfügbar';

function notReady<T>(): Result<T> {
  return { ok: false, error: NOT_READY };
}

// ───────────────────────────────────────────────────────────── deck ──

/** STUB — backend: due rows + next_new_words + unreviewed scan cards, cap 30. */
export async function buildSession(
  userId: string,
  level: CEFRLevel,
  opts?: { maxCards?: number; seed?: number },
): Promise<Result<DeckSession>> {
  void userId;
  void level;
  void opts;
  return notReady<DeckSession>();
}

/** STUB — backend: today's persisted session from AsyncStorage, same user + local day. */
export async function resumeSession(userId: string): Promise<DeckSession | null> {
  void userId;
  return null;
}

/**
 * Pure. Reshuffles only the part of the queue the learner has not reached yet.
 * STUB detail: plain Fisher–Yates. Backend swaps in `constrainedShuffle` so no
 * more than two new cards land in a row (PRD F3.2 / D9).
 */
export function shuffleRemaining(session: DeckSession, seed?: number): DeckSession {
  const nextSeed = seed ?? (session.seed + 1) >>> 0;
  const rng = mulberry32(nextSeed);
  const done = session.queue.slice(0, session.position);
  const remaining = session.queue.slice(session.position);
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return { ...session, seed: nextSeed, queue: [...done, ...remaining] };
}

/**
 * STUB — advances the position so the session loop is walkable in the UI.
 * Backend: schedule() → upsert word_progress, re-queue on grade 0, logActivity,
 * buffer to lib/progress.ts when offline.
 */
export async function gradeCard(session: DeckSession, grade: Grade): Promise<DeckSession> {
  void grade;
  return {
    ...session,
    position: Math.min(session.position + 1, session.queue.length),
    stats: { ...session.stats, reviewed: session.stats.reviewed + 1 },
  };
}

/** STUB — backend: insert word_progress rows with the given `added_via`. */
export async function addToDeck(
  userId: string,
  wordIds: string[],
  via: 'level' | 'scan' | 'manual',
): Promise<Result<number>> {
  void userId;
  void wordIds;
  void via;
  return notReady<number>();
}

// ────────────────────────────────────────────────────────── shuffle ──
// Pure and unit-tested. Backend moves the implementations into lib/shuffle.ts
// and re-exports them here; the signatures stay exactly as below.

/** Seeded PRNG. Same seed ⇒ same sequence, so a resumed session reproduces its order. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * STUB — Fisher–Yates only. Backend adds the repair pass that breaks runs of
 * more than `maxNewRun` new cards by swapping with the nearest later review card.
 */
export function constrainedShuffle<T>(
  items: T[],
  isNew: (t: T) => boolean,
  rng: () => number,
  maxNewRun = 2,
): T[] {
  void isNew;
  void maxNewRun;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Where a "Nochmal" card goes back into the queue: 3–5 ahead, clamped to the end. */
export function reinsertIndex(position: number, length: number, rng: () => number): number {
  const offset = 3 + Math.floor(rng() * 3); // 3, 4 or 5
  return Math.min(position + offset, length);
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
