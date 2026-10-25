/**
 * Deck session state (PRD F3, decision D13).
 *
 * Everything that touches the deck goes through `lib/api.ts` — CONTRACTS §4 is
 * frozen, so this hook is written against the final signatures even while the
 * backend agent is still filling the bodies in. Until that merges,
 * `buildSession()` resolves to `{ ok:false, error:'Noch nicht verfügbar' }` and
 * the screen shows its error state; nothing here changes when it lights up.
 *
 * Replaces `hooks/useSRS.ts` for the deck screen: the queue, the shuffle and
 * the scheduling all live behind the API now, and this hook only owns what is
 * genuinely screen state — which card is face-up, session XP, the timer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildSession,
  gradeCard,
  getEnrichment,
  prefetchEnrichment,
  resumeSession,
  shuffleRemaining,
} from '../lib/api';
import { createSessionTimer } from '../lib/activity';
import { track } from '../lib/analytics';
import { GRADES } from '../constants/Colors';
import type { CEFRLevel } from '../types';
import type { DeckCard, DeckSession, Grade, WordEnrichment } from '../types/contracts';

export type DeckStatus =
  | 'signed-out'
  | 'loading'
  | 'error'     // buildSession failed — message is German, straight from Result.error
  | 'empty'     // nothing due and nothing new left at this level (F3.8)
  | 'reviewing'
  | 'finished';

/** How far ahead enrichment is warmed (F3.6). */
const PREFETCH_AHEAD = 3;

/**
 * Shown when `buildSession` succeeds with an empty queue (lib/api.ts). Fixed
 * per the frontend agent's own contract request: nothing-due is now a typed
 * success (`queue.length === 0`), not a string pattern-matched out of the
 * error channel — see docs/agents/status/frontend.md #1 for the prior state.
 */
const NOTHING_DUE_MESSAGE = 'Heute ist nichts fällig. Gut gemacht!';

export function useDeckSession(userId: string | null, levels: CEFRLevel[]) {
  // A stable key, so a new array with the same levels does not reload the deck.
  const levelKey = levels.join(',');
  const [session, setSession] = useState<DeckSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** The API's own German "nothing due" line, kept so the empty state can show it. */
  const [nothingDue, setNothingDue] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  /**
   * Which face is CURRENTLY showing. Separate from `revealed` on purpose:
   * `revealed` means "this card has been checked at least once" and is what
   * unlocks grading (footer swap, swipeEnabled) — it only ever turns on and
   * stays on for the card's lifetime. Flipping back to re-read the English
   * after already seeing the answer is not a second attempt at the card, so
   * it must not re-lock grading; `facingBack` is what the tap gesture toggles
   * freely once `revealed` is true.
   */
  const [facingBack, setFacingBack] = useState(false);
  const [grading, setGrading] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [enrichments, setEnrichments] = useState<Record<string, WordEnrichment>>({});
  const [enriching, setEnriching] = useState(false);

  // Ignore the result of a load that a newer one has already superseded.
  const loadToken = useRef(0);
  const timer = useRef(createSessionTimer());
  const flushedFor = useRef<string | null>(null);
  // Read inside the unmount cleanup, where state would be stale.
  const totals = useRef({ cards: 0, xp: 0 });
  totals.current = { cards: reviewed, xp: sessionXp };

  const load = useCallback(async (mode: 'resume' | 'rebuild' = 'resume') => {
    const token = ++loadToken.current;
    setLoading(true);
    setError(null);
    setNothingDue(null);
    setRevealed(false);
    setFacingBack(false);

    if (!userId) {
      if (token === loadToken.current) setLoading(false);
      return;
    }

    if (mode === 'resume') {
      // F3.4: the day's queue and position survive a tab switch or an app kill.
      const existing = await resumeSession(userId);
      if (token !== loadToken.current) return;
      if (existing) {
        setSession(existing);
        setLoading(false);
        return;
      }
    }

    const result = await buildSession(userId, levelKey.split(',') as CEFRLevel[]);
    if (token !== loadToken.current) return;

    if (!result.ok) {
      setSession(null);
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.data.queue.length === 0) {
      setSession(null);
      setNothingDue(NOTHING_DUE_MESSAGE);
      setLoading(false);
      return;
    }

    setSession(result.data);
    setSessionXp(0);
    setReviewed(0);
    setLoading(false);
    track('session_started', { due: result.data.stats.due, new: result.data.stats.new });
  }, [userId, levelKey]);

  useEffect(() => { void load('resume'); }, [load]);

  // Study time is time on this screen. Flushed on unmount so a backgrounded
  // session still counts and minutes are never logged twice.
  useEffect(() => {
    const t = timer.current;
    t.start();
    return () => { void t.stop({ cards: totals.current.cards, xp: totals.current.xp }); };
  }, []);

  const current: DeckCard | null = useMemo(() => {
    if (!session) return null;
    return session.queue[session.position] ?? null;
  }, [session]);

  const status: DeckStatus = useMemo(() => {
    if (!userId) return 'signed-out';
    if (loading) return 'loading';
    if (error) return 'error';
    if (!session || session.queue.length === 0) return 'empty';
    return current ? 'reviewing' : 'finished';
  }, [userId, loading, error, session, current]);

  // Log the finished session once, the moment it finishes, so the streak and
  // the daily ring update without waiting for the learner to leave the tab.
  useEffect(() => {
    if (status !== 'finished' || !session) return;
    if (flushedFor.current === session.id) return;
    flushedFor.current = session.id;
    const t = timer.current;
    void t.stop({ cards: totals.current.cards, xp: totals.current.xp }).then(() => t.start());
  }, [status, session]);

  // F3.6: warm the next few cards so a flip never waits on the network.
  useEffect(() => {
    if (!session) return;
    const ahead = session.queue
      .slice(session.position, session.position + PREFETCH_AHEAD + 1)
      .map((card) => card.word.id);
    if (ahead.length > 0) prefetchEnrichment(ahead);
  }, [session]);

  /** The card back renders from the catalogue immediately; this only ever adds. */
  const enrichmentFor = useCallback((card: DeckCard | null): WordEnrichment | null => {
    if (!card) return null;
    return card.enrichment ?? enrichments[card.word.id] ?? null;
  }, [enrichments]);

  /**
   * Tapping the card. First tap unlocks grading for good (`revealed`) and
   * shows the back; every tap after that just toggles which face is showing —
   * looking at the English again is review, not a second attempt, so it must
   * never re-lock the grade buttons or the swipe gesture.
   */
  const flip = useCallback(() => {
    if (!current) return;

    if (!revealed) {
      setRevealed(true);
      setFacingBack(true);

      // Only spend a generation on a card the learner actually turned over.
      if (!current.enrichment && !enrichments[current.word.id]) {
        const wordId = current.word.id;
        setEnriching(true);
        void getEnrichment(wordId).then((result) => {
          setEnriching(false);
          // A failure is not an error state: catalogue fields are already there.
          if (result.ok) setEnrichments((prev) => ({ ...prev, [wordId]: result.data }));
        });
      }
      return;
    }

    setFacingBack((f) => !f);
  }, [revealed, current, enrichments]);

  const grade = useCallback(async (value: Grade) => {
    if (!session || !current || grading) return;
    setGrading(true);
    const origin = current.word.origin;
    try {
      const next = await gradeCard(session, value);
      setSession(next);
      setRevealed(false);
      setFacingBack(false);
      setReviewed((n) => n + 1);
      setSessionXp((xp) => xp + GRADES[value].xp);
      track('card_graded', { grade: value, origin });
    } finally {
      setGrading(false);
    }
  }, [session, current, grading]);

  /** F3.2 — reshuffles only what is still ahead of the learner. Pure, no await. */
  const shuffle = useCallback(() => {
    if (!session) return;
    setSession(shuffleRemaining(session));
    setRevealed(false);
    setFacingBack(false);
    track('deck_shuffled');
  }, [session]);

  return {
    status,
    error,
    /** German, from the API, when `status === 'empty'`. */
    nothingDue,
    session,
    current,
    revealed,
    facingBack,
    grading,
    enriching,
    enrichment: enrichmentFor(current),
    sessionXp,
    reviewed,
    position: session ? Math.min(session.position + 1, session.queue.length) : 0,
    total: session?.queue.length ?? 0,
    flip,
    grade,
    shuffle,
    /** Retry after an error, and "Weiter lernen" / "Neue Wörter lernen" (F3.8). */
    rebuild: () => load('rebuild'),
    retry: () => load('resume'),
  };
}
