import { describe, expect, it } from 'vitest';
import { chunkIds, dueIdsInLevels } from '../dueLevels';

type W = { id: string; level: string };
const words = new Map<string, W>([
  ['a1-1', { id: 'a1-1', level: 'A1' }],
  ['a2-1', { id: 'a2-1', level: 'A2' }],
  ['b1-1', { id: 'b1-1', level: 'B1' }],
  ['b1-2', { id: 'b1-2', level: 'B1' }],
  ['b2-1', { id: 'b2-1', level: 'B2' }],
]);

describe('dueIdsInLevels (BUG-004)', () => {
  it('drops due words from levels the learner no longer selected', () => {
    const due = ['a1-1', 'b1-1', 'a2-1', 'b2-1', 'b1-2'];
    expect(dueIdsInLevels(due, words, ['B1', 'B2'], 30)).toEqual(['b1-1', 'b2-1', 'b1-2']);
  });

  it('keeps the most-overdue-first order', () => {
    expect(dueIdsInLevels(['b1-2', 'b2-1', 'b1-1'], words, ['B1', 'B2'], 30)).toEqual(['b1-2', 'b2-1', 'b1-1']);
  });

  it('returns nothing when no due word is in the selected levels', () => {
    expect(dueIdsInLevels(['a1-1', 'a2-1'], words, ['B1'], 30)).toEqual([]);
  });

  it('caps the result after filtering, so other-level words do not use up the limit', () => {
    const due = ['a1-1', 'a2-1', 'b1-1', 'b1-2', 'b2-1'];
    expect(dueIdsInLevels(due, words, ['B1', 'B2'], 2)).toEqual(['b1-1', 'b1-2']);
  });

  it('skips ids that are not in the loaded word map', () => {
    expect(dueIdsInLevels(['missing', 'b1-1'], words, ['B1'], 5)).toEqual(['b1-1']);
  });
});

describe('chunkIds', () => {
  it('splits into chunks of the given size, keeping order', () => {
    expect(chunkIds(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('returns no chunks for an empty list', () => {
    expect(chunkIds([])).toEqual([]);
  });
});
