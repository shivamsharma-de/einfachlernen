import { describe, it, expect } from 'vitest';
import { estimatedProgress, stageLabel, tipAt, SCAN_TIPS } from '../scanTips';

describe('estimatedProgress', () => {
  it('starts at zero and never reaches 100% on its own', () => {
    expect(estimatedProgress(0)).toBe(0);
    expect(estimatedProgress(1000)).toBeLessThan(0.96);
  });
  it('rises monotonically', () => {
    expect(estimatedProgress(5)).toBeLessThan(estimatedProgress(10));
    expect(estimatedProgress(10)).toBeLessThan(estimatedProgress(20));
  });
});

describe('stageLabel', () => {
  it('moves through the stages in order', () => {
    expect(stageLabel(0.05)).toBe('Foto wird vorbereitet');
    expect(stageLabel(0.2)).toBe('Foto wird an die Texterkennung gesendet');
    expect(stageLabel(0.5)).toBe('Wörter werden erkannt');
    expect(stageLabel(0.9)).toBe('Bedeutungen und Beispiele werden geschrieben');
  });
});

describe('tipAt', () => {
  it('cycles through the tips and wraps negative steps', () => {
    expect(tipAt(0)).toBe(SCAN_TIPS[0]);
    expect(tipAt(SCAN_TIPS.length)).toBe(SCAN_TIPS[0]);
    expect(tipAt(-1)).toBe(SCAN_TIPS[SCAN_TIPS.length - 1]);
  });
});
