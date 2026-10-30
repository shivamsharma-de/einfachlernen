import { describe, it, expect } from 'vitest';
import { darkColors, lightColors, type ColorTokens } from '../../constants/Colors';
import { resolveScheme } from '../theme';

/** WCAG relative luminance of an opaque #rrggbb colour. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('resolveScheme', () => {
  it('follows the phone in System mode', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
  });

  it('defaults to dark when the phone reports no scheme', () => {
    expect(resolveScheme('system', null)).toBe('dark');
    expect(resolveScheme('system', undefined)).toBe('dark');
  });

  it('forces the chosen scheme, whatever the phone says', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', null)).toBe('light');
  });
});

describe('palettes', () => {
  it('have exactly the same keys, so no role can be missing in one theme', () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
  });

  it('use hex for every opaque colour, so contrast can be checked', () => {
    for (const palette of [darkColors, lightColors]) {
      for (const [key, value] of Object.entries(palette)) {
        if (value.startsWith('rgba')) continue; // tints are checked by their solid partner
        expect(value, key).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
});

// Text pairs that must read at WCAG AA (4.5:1) in both themes. Pairs are [foreground, background].
const TEXT_PAIRS: [keyof ColorTokens, keyof ColorTokens][] = [
  ['text', 'bg'], ['text', 'surface'],
  ['textMuted', 'bg'], ['textMuted', 'surface2'],
  ['purple', 'bg'], ['purple', 'surface'],
  ['goldText', 'bg'],
  ['green', 'bg'], ['red', 'bg'], ['blue', 'bg'],
  ['articleDer', 'bg'], ['articleDie', 'bg'], ['articleDas', 'bg'],
  ['onAccent', 'purple'],
  ['onGold', 'gold'],
  ['inverseText', 'inverseFill'],
];

describe.each([['dark', darkColors], ['light', lightColors]] as const)('%s theme text contrast', (_name, palette) => {
  for (const [fg, bg] of TEXT_PAIRS) {
    it(`${fg} on ${bg} is at least 4.5:1`, () => {
      expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('gold graphics (rings, bars) are at least 3:1 on the background', () => {
    expect(contrast(palette.gold, palette.bg)).toBeGreaterThanOrEqual(3);
  });

  it('dividers are never used as text, so textDim only needs to be visible', () => {
    expect(contrast(palette.textDim, palette.bg)).toBeGreaterThan(1.5);
  });
});
