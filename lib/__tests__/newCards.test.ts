import { describe, it, expect } from 'vitest';
import { takeNewCards } from '../newCards';

describe('takeNewCards', () => {
  it('fills with central words first, then personal words', () => {
    expect(takeNewCards(5, ['c1', 'c2'], ['p1', 'p2'])).toEqual(['c1', 'c2', 'p1', 'p2']);
  });
  it('never exceeds the room', () => {
    expect(takeNewCards(3, ['c1', 'c2', 'c3', 'c4'], ['p1'])).toEqual(['c1', 'c2', 'c3']);
  });
  it('uses personal words when there are no central ones', () => {
    expect(takeNewCards(2, [], ['p1', 'p2', 'p3'])).toEqual(['p1', 'p2']);
  });
  it('returns nothing when there is no room', () => {
    expect(takeNewCards(0, ['c1'], ['p1'])).toEqual([]);
    expect(takeNewCards(-4, ['c1'], ['p1'])).toEqual([]);
  });
});
