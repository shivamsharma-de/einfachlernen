import { describe, it, expect } from 'vitest';
import { coverageOf } from '../coverage';

describe('coverageOf', () => {
  it('is zero without boxes', () => {
    expect(coverageOf([], 100, 100)).toBe(0);
  });
  it('is the share of the frame a box covers', () => {
    const half = { left: 0, top: 0, width: 100, height: 50 };
    expect(coverageOf([half], 100, 100)).toBeCloseTo(0.5, 1);
  });
  it('counts overlapping boxes once', () => {
    const a = { left: 0, top: 0, width: 60, height: 100 };
    const b = { left: 40, top: 0, width: 60, height: 100 };
    expect(coverageOf([a, b], 100, 100)).toBeCloseTo(1, 1);
  });
  it('ignores boxes outside the frame', () => {
    expect(coverageOf([{ left: 200, top: 200, width: 50, height: 50 }], 100, 100)).toBe(0);
  });
  it('returns zero for an empty image', () => {
    expect(coverageOf([{ left: 0, top: 0, width: 10, height: 10 }], 0, 0)).toBe(0);
  });
});
