import { describe, it, expect } from 'vitest';
import { decidePage, GATE_THRESHOLDS, type PageMeasurement } from '../pageGate';

const SAFE = { drawing: 0.05, hentai: 0, neutral: 0.95, porn: 0, sexy: 0.02 };
const page: PageMeasurement = { textCoverage: 0.6, wordCount: 120, humanCoverage: 0, nsfw: SAFE };

describe('decidePage', () => {
  it('allows a page of text', () => {
    expect(decidePage(page)).toEqual({ allow: true });
  });

  it('fails closed when a measurement is missing', () => {
    expect(decidePage(null)).toEqual({ allow: false, reason: 'unavailable' });
    expect(decidePage({ ...page, nsfw: null })).toEqual({ allow: false, reason: 'unavailable' });
    expect(decidePage({ ...page, textCoverage: NaN })).toEqual({ allow: false, reason: 'unavailable' });
  });

  it('blocks explicit content, even on a page with text', () => {
    const explicit = { ...page, nsfw: { drawing: 0, hentai: 0, neutral: 0.1, porn: 0.2, sexy: 0.2 } };
    expect(decidePage(explicit)).toEqual({ allow: false, reason: 'explicit' });
  });

  it('blocks skin or people filling the frame', () => {
    expect(decidePage({ ...page, humanCoverage: 0.3 })).toEqual({ allow: false, reason: 'people' });
  });

  it('blocks images without enough text', () => {
    expect(decidePage({ ...page, textCoverage: 0.02, wordCount: 120 })).toEqual({ allow: false, reason: 'no_text' });
    expect(decidePage({ ...page, wordCount: 4 })).toEqual({ allow: false, reason: 'no_text' });
  });

  it('allows a sparse vocabulary table with many words', () => {
    expect(decidePage({ ...page, textCoverage: 0.1, wordCount: 46 })).toEqual({ allow: true });
  });

  it('still blocks sparse text with few words', () => {
    expect(decidePage({ ...page, textCoverage: 0.1, wordCount: 20 })).toEqual({ allow: false, reason: 'no_text' });
  });

  it('checks explicit content before people and text', () => {
    const worst = { textCoverage: 0, wordCount: 0, humanCoverage: 1, nsfw: { drawing: 0, hentai: 0, neutral: 0, porn: 1, sexy: 0 } };
    expect(decidePage(worst)).toEqual({ allow: false, reason: 'explicit' });
  });

  it('keeps the thresholds at the documented strictness', () => {
    expect(GATE_THRESHOLDS.minTextCoverage).toBe(0.2);
    expect(GATE_THRESHOLDS.maxHumanCoverage).toBe(0.02);
  });
});
