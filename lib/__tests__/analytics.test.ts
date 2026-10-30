import { describe, it, expect, vi } from 'vitest';

// The PostHog SDK is React Native code. Analytics is off in tests (no key is set), so the
// SDK is never constructed; the mock only stops vitest from parsing the RN package.
vi.mock('posthog-react-native', () => ({ default: class {} }));

import { sanitizeProperties, toErrorCode, track, timer, MAX_STRING_LENGTH } from '../analytics';

describe('sanitizeProperties', () => {
  it('passes allowed enum values, numbers and booleans', () => {
    const out = sanitizeProperties({
      method: 'apple',
      reason_code: 'cancelled',
      origin: 'scan',
      mode: 'first_look',
      error_code: 'rate_limited',
      area: 'scan',
      lang: 'de',
      found: 'candidate',
      grade: 2,
      is_new: true,
      minutes: 14,
      duration_ms: 1840,
      ok: false,
    });
    expect(out).toEqual({
      method: 'apple',
      reason_code: 'cancelled',
      origin: 'scan',
      mode: 'first_look',
      error_code: 'rate_limited',
      area: 'scan',
      lang: 'de',
      found: 'candidate',
      grade: 2,
      is_new: true,
      minutes: 14,
      duration_ms: 1840,
      ok: false,
    });
  });

  it('drops free text, even under an allowed key', () => {
    const out = sanitizeProperties({
      reason_code: 'Anmeldung fehlgeschlagen: Konto gesperrt',
      method: 'max.mustermann@example.com',
      error_code: 'Das Bild ist zu groß',
    });
    expect(out).toEqual({});
  });

  it('drops values longer than 40 characters, even if the key is allowed', () => {
    const long = 'apple'.padEnd(MAX_STRING_LENGTH + 1, 'x');
    expect(sanitizeProperties({ method: long })).toEqual({});
    expect(sanitizeProperties({ method: 'apple' })).toEqual({ method: 'apple' });
  });

  it('rejects a German word, whatever key it arrives under', () => {
    expect(sanitizeProperties({ word: 'Zauberstab' })).toEqual({});
    expect(sanitizeProperties({ found: 'Zauberstab' })).toEqual({});
    expect(sanitizeProperties({ theme_id: 'Hund' })).toEqual({});
  });

  it('drops keys that are not in the schema, including email and name', () => {
    expect(sanitizeProperties({ email: 'a@b.de', name: 'Anna', levels: 'A1,A2' })).toEqual({});
  });

  it('drops non-finite numbers and wrong types', () => {
    expect(sanitizeProperties({ minutes: Number.NaN, cards: Number.POSITIVE_INFINITY })).toEqual({});
    expect(sanitizeProperties({ cards: '12' as unknown as number })).toEqual({});
    expect(sanitizeProperties({ ok: null as unknown as boolean })).toEqual({});
  });

  it('keeps numbers and booleans that are real counts and flags', () => {
    expect(sanitizeProperties({ correct: 0, total: 10, perfect: false })).toEqual({
      correct: 0,
      total: 10,
      perfect: false,
    });
  });
});

describe('timing properties', () => {
  it('keeps every timing key the events carry', () => {
    const out = sanitizeProperties({
      load_ms: 412, think_ms: 3050, active_s: 610, duration_ms: 9000,
      prep_ms: 120, gate_ms: 480, network_ms: 2100, image_kb: 340,
    });
    expect(Object.keys(out).sort()).toEqual(
      ['active_s', 'duration_ms', 'gate_ms', 'image_kb', 'load_ms', 'network_ms', 'prep_ms', 'think_ms'],
    );
  });

  it('drops a timing key that is sent as a string', () => {
    expect(sanitizeProperties({ think_ms: '3050' })).toEqual({});
  });

  it('timer returns a whole, non-negative number of milliseconds', () => {
    const elapsed = timer();
    const ms = elapsed();
    expect(Number.isInteger(ms)).toBe(true);
    expect(ms).toBeGreaterThanOrEqual(0);
  });
});

describe('toErrorCode', () => {
  it('keeps catalogue codes', () => {
    expect(toErrorCode('model_busy')).toBe('model_busy');
  });

  it('maps unknown or free-text codes to unknown', () => {
    expect(toErrorCode('Das Bild ist zu groß')).toBe('unknown');
    expect(toErrorCode(undefined)).toBe('unknown');
  });
});

describe('track', () => {
  it('is a no-op without a PostHog key and never throws', () => {
    expect(() => track('word_deleted')).not.toThrow();
    expect(() => track('error_shown', { area: 'deck', error_code: 'Fehler im Netz' as never })).not.toThrow();
  });
});

describe('session replay masking', () => {
  it('masks all text, images and sandboxed views, and records no taps or console logs', async () => {
    const { REPLAY_CONFIG } = await import('../analytics');
    expect(REPLAY_CONFIG).toEqual({
      maskAllTextInputs: true,
      maskAllImages: true,
      maskAllSandboxedViews: true,
      captureTouches: false,
      captureLog: false,
    });
  });
});
