import { describe, expect, it } from 'vitest';
import { constrainedShuffle, mulberry32, reinsertIndex } from '../shuffle';

type Card = { id: number; isNew: boolean };
const isNew = (c: Card) => c.isNew;

function deck(newCount: number, reviewCount: number): Card[] {
  return [
    ...Array.from({ length: newCount }, (_, i) => ({ id: i, isNew: true })),
    ...Array.from({ length: reviewCount }, (_, i) => ({ id: 1000 + i, isNew: false })),
  ];
}

/** Longest run of consecutive new cards. */
function longestNewRun(cards: Card[]): number {
  let best = 0;
  let run = 0;
  for (const c of cards) {
    run = c.isNew ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = Array.from({ length: 20 }, mulberry32(42));
    const b = Array.from({ length: 20 }, mulberry32(42));
    expect(a).toEqual(b);
  });

  it('gives different sequences for different seeds', () => {
    expect(Array.from({ length: 10 }, mulberry32(1))).not.toEqual(
      Array.from({ length: 10 }, mulberry32(2)),
    );
  });

  it('stays in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('constrainedShuffle', () => {
  it('reproduces the same order for the same seed — a resumed session looks unchanged', () => {
    const cards = deck(10, 20);
    expect(constrainedShuffle(cards, isNew, mulberry32(99))).toEqual(
      constrainedShuffle(cards, isNew, mulberry32(99)),
    );
  });

  it('is a permutation: nothing is lost or duplicated', () => {
    const cards = deck(12, 18);
    const out = constrainedShuffle(cards, isNew, mulberry32(5));
    expect(out).toHaveLength(cards.length);
    expect(out.map((c) => c.id).sort((a, b) => a - b)).toEqual(
      cards.map((c) => c.id).sort((a, b) => a - b),
    );
  });

  it('does not mutate its input', () => {
    const cards = deck(5, 5);
    const snapshot = [...cards];
    constrainedShuffle(cards, isNew, mulberry32(3));
    expect(cards).toEqual(snapshot);
  });

  it('never leaves more than maxNewRun new cards in a row, over 1000 seeds', () => {
    const cards = deck(10, 20);
    for (let seed = 0; seed < 1000; seed++) {
      const out = constrainedShuffle(cards, isNew, mulberry32(seed));
      expect(longestNewRun(out)).toBeLessThanOrEqual(2);
    }
  });

  it('honours a custom maxNewRun', () => {
    const cards = deck(10, 20);
    for (let seed = 0; seed < 200; seed++) {
      expect(longestNewRun(constrainedShuffle(cards, isNew, mulberry32(seed), 1))).toBeLessThanOrEqual(1);
    }
  });

  it('handles an all-new deck by leaving the run in place rather than looping', () => {
    const cards = deck(8, 0);
    const out = constrainedShuffle(cards, isNew, mulberry32(1));
    expect(out).toHaveLength(8);
    expect(longestNewRun(out)).toBe(8); // nothing to swap with, and that is fine
  });

  it('handles empty and single-item decks', () => {
    expect(constrainedShuffle([], isNew, mulberry32(1))).toEqual([]);
    const one = deck(1, 0);
    expect(constrainedShuffle(one, isNew, mulberry32(1))).toEqual(one);
  });

  it('actually reorders — it is not the identity', () => {
    const cards = deck(0, 30);
    const orders = new Set(
      Array.from({ length: 5 }, (_, s) => constrainedShuffle(cards, isNew, mulberry32(s)).map((c) => c.id).join(',')),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('reinsertIndex', () => {
  it('lands 3 to 5 positions ahead', () => {
    for (let seed = 0; seed < 300; seed++) {
      const at = reinsertIndex(10, 100, mulberry32(seed));
      expect(at).toBeGreaterThanOrEqual(13);
      expect(at).toBeLessThanOrEqual(15);
    }
  });

  it('clamps to the end so the last card still comes back', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(reinsertIndex(9, 10, mulberry32(seed))).toBe(10);
    }
  });
});
