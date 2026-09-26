/** SM-2 lite, extended from the two-outcome version in the architecture doc to
 *  the four grades the deck design uses (design-spec.md §6.4, PRD v2 D7).
 *
 *  Pure functions only — no storage, no React. The deck screen needs to compute
 *  the next interval for all four buttons *before* the user picks one, so the
 *  labels tell the truth; that only works if scheduling is a pure function of
 *  the current card state.
 */

export type Grade = 0 | 1 | 2 | 3; // again | hard | good | easy

export interface SRSState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lapses: number;
}

export const INITIAL_SRS: SRSState = {
  repetitions: 0,
  intervalDays: 0,
  easeFactor: 2.5,
  lapses: 0,
};

/** SM-2 floors EF at 1.30; below that intervals collapse and the card churns. */
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
/** Cap runaway intervals so a card cannot vanish for a decade. */
const MAX_INTERVAL_DAYS = 365;

const EASE_DELTA: Record<Grade, number> = {
  0: -0.20, // again
  1: -0.15, // hard
  2: 0,     // good
  3: +0.15, // easy
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Next state for a card given a grade. Does not touch the clock — the caller
 *  turns `intervalDays` into a date, so this stays deterministic and testable. */
export function schedule(state: SRSState, grade: Grade): SRSState {
  const easeFactor = clamp(state.easeFactor + EASE_DELTA[grade], MIN_EASE, MAX_EASE);

  // "again" resets the learning phase: the card comes back in this same session.
  if (grade === 0) {
    return {
      repetitions: 0,
      intervalDays: 0,
      easeFactor,
      lapses: state.lapses + (state.repetitions > 0 ? 1 : 0),
    };
  }

  const repetitions = state.repetitions + 1;
  let intervalDays: number;

  if (repetitions === 1) {
    intervalDays = grade === 3 ? 3 : 1;
  } else if (repetitions === 2) {
    intervalDays = grade === 3 ? 8 : 6;
  } else {
    const base = Math.max(state.intervalDays, 1);
    // hard advances slowly, good by the ease factor, easy by a further 1.3x.
    const multiplier = grade === 1 ? 1.2 : grade === 2 ? easeFactor : easeFactor * 1.3;
    intervalDays = Math.round(base * multiplier);
  }

  return {
    repetitions,
    intervalDays: clamp(intervalDays, 1, MAX_INTERVAL_DAYS),
    easeFactor,
    lapses: state.lapses,
  };
}

/** The four intervals a card would get, in GRADES order. Feeds GradeRow labels. */
export function previewIntervals(state: SRSState): [string, string, string, string] {
  return [0, 1, 2, 3].map(g => formatInterval(schedule(state, g as Grade).intervalDays)) as
    [string, string, string, string];
}

/** German interval label. `0` means "again this session", shown as a minute. */
export function formatInterval(days: number): string {
  if (days <= 0) return '1 Min';
  if (days === 1) return '1 Tag';
  if (days < 30) return `${days} Tage`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 Monat' : `${months} Monate`;
}

/** ISO date (yyyy-mm-dd) this card is next due, from a base of today. */
export function nextReviewDate(intervalDays: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + Math.max(0, intervalDays));
  return d.toISOString().slice(0, 10);
}

/** XP for a grade — 2 for "again", 10 otherwise (design-spec.md §6.4). */
export function xpForGrade(grade: Grade): number {
  return grade === 0 ? 2 : 10;
}

/** A card is mastered once it has survived several successful reps and is
 *  scheduled far enough out that it is no longer active study. */
export function isMastered(state: SRSState): boolean {
  return state.repetitions >= 5 && state.intervalDays >= 21;
}
