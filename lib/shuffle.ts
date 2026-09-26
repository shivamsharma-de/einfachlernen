/**
 * Deck ordering. Pure, seeded, and deliberately not "random".
 *
 * PRD D9: pure randomness can deal eight new cards in a row, which is the most
 * discouraging session a learner can be handed. Seeded so a resumed session
 * reproduces the order it had before the app was closed.
 *
 * This is one of the few pieces that genuinely belongs in client code rather
 * than in Postgres — a deterministic RNG with a repair pass is awkward SQL.
 */

/** Small fast PRNG. Same seed, same sequence, on every device. */
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
 * Fisher–Yates, then a repair pass that breaks up runs of more than
 * `maxNewRun` new cards by swapping the offender with a review card.
 *
 * It prefers the nearest *later* review card, which never disturbs part of the
 * queue the learner has already seen. When the run sits at the tail there is no
 * later review card left, so it falls back to the nearest *earlier* one — but
 * only where moving a new card there would not create a fresh violation. That
 * tail case is not an edge case: a shuffle that ends on a wall of new cards is
 * exactly the discouraging finish D9 exists to prevent.
 *
 * With too few review cards to break every run — an all-new deck — the run
 * stands. A worse-but-honest order beats looping forever.
 */
export function constrainedShuffle<T>(
  items: T[],
  isNew: (t: T) => boolean,
  rng: () => number,
  maxNewRun = 2,
): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  /** Length of the new-card run that would form if position k held a new card. */
  const runIfNewAt = (k: number): number => {
    let n = 1;
    for (let a = k - 1; a >= 0 && isNew(out[a]); a--) n++;
    for (let b = k + 1; b < out.length && isNew(out[b]); b++) n++;
    return n;
  };

  let run = 0;
  for (let i = 0; i < out.length; i++) {
    if (!isNew(out[i])) {
      run = 0;
      continue;
    }
    run++;
    if (run <= maxNewRun) continue;

    let swapAt = -1;
    for (let k = i + 1; k < out.length; k++) {
      if (!isNew(out[k])) {
        swapAt = k;
        break;
      }
    }
    if (swapAt === -1) {
      // Tail run: look backwards, but only at a slot that can absorb a new card.
      for (let k = i - 1; k >= 0; k--) {
        if (!isNew(out[k]) && runIfNewAt(k) <= maxNewRun) {
          swapAt = k;
          break;
        }
      }
    }
    if (swapAt === -1) break; // genuinely nothing left to trade with

    [out[i], out[swapAt]] = [out[swapAt], out[i]];
    run = 0;
  }

  return out;
}

/**
 * Where a "Nochmal" card goes back into the queue: 3–5 positions ahead, so it
 * returns within the session but not immediately (PRD F3.3). Clamped to the
 * end, so the last card of a session still reappears rather than vanishing.
 */
export function reinsertIndex(position: number, length: number, rng: () => number): number {
  const offset = 3 + Math.floor(rng() * 3); // 3, 4 or 5
  return Math.min(position + offset, length);
}
