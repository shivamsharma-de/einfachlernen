import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchProgress, buildSession, gradeCard, toSRSState, WordProgressRow,
} from '../lib/deck';
import { logActivity } from '../lib/activity';
import { Grade, SRSState, previewIntervals, INITIAL_SRS } from '../lib/srs';
import { CEFRLevel, Word } from '../types';

/** Deck session state.
 *
 *  The scheduler itself lives in lib/srs.ts as pure functions; this hook owns
 *  the session queue, the reveal state, and persistence.
 *
 *  A card graded "again" is requeued at the end of the current session rather
 *  than disappearing until tomorrow — that is what "1 Min" on the button means. */
export function useSRS(words: Word[], level: CEFRLevel, userId: string | null, sessionSize = 12) {
  const [progress, setProgress] = useState<Map<string, WordProgressRow>>(new Map());
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  // Live SRS state per card, so intervals reflect grades given this session.
  const [states, setStates] = useState<Map<string, SRSState>>(new Map());

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const rows = await fetchProgress(userId);
      if (cancelled) return;

      const session = buildSession(words, rows, level, sessionSize);
      setProgress(rows);
      setStates(new Map(session.map(w => [w.id, toSRSState(rows.get(w.id))])));
      setQueue(session);
      setIndex(0);
      setRevealed(false);
      setSessionXp(0);
      setReviewed(0);
      setDone(session.length === 0);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [words, level, userId, sessionSize]);

  const current: Word | undefined = queue[index];
  const currentState = current ? states.get(current.id) ?? INITIAL_SRS : INITIAL_SRS;

  /** The four labels for GradeRow — real next-intervals for THIS card. */
  const intervals = useMemo(() => previewIntervals(currentState), [currentState]);

  const reveal = useCallback(() => setRevealed(r => !r), []);

  const grade = useCallback(async (g: Grade) => {
    if (!current || !userId) return;

    const { next, xp } = await gradeCard(userId, current.id, currentState, g);

    setStates(prev => new Map(prev).set(current.id, next));
    setProgress(prev => prev); // rows refresh on next session build
    setSessionXp(x => x + xp);
    setReviewed(n => n + 1);
    setRevealed(false);

    setQueue(prevQueue => {
      // "again" sends the card to the back of this session.
      const requeue = g === 0;
      const nextQueue = requeue ? [...prevQueue, current] : prevQueue;
      const nextIndex = index + 1;
      if (nextIndex >= nextQueue.length) setDone(true);
      return nextQueue;
    });
    setIndex(i => i + 1);
  }, [current, currentState, userId, index]);

  /** Flush session totals. Minutes are logged by the screen's timer. */
  const finish = useCallback(async () => {
    if (reviewed === 0) return;
    await logActivity({ cards: reviewed, xp: sessionXp });
  }, [reviewed, sessionXp]);

  return {
    current,
    revealed,
    intervals,
    sessionXp,
    reviewed,
    total: queue.length,
    position: Math.min(index + 1, queue.length),
    loading,
    done: done || (!loading && queue.length === 0),
    empty: !loading && queue.length === 0,
    progress,
    reveal,
    grade,
    finish,
  };
}
