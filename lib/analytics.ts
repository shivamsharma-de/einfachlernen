/**
 * Product analytics (PostHog), with a typed event catalogue and a privacy gate.
 *
 * Privacy rule, enforced here and not left to callers: an event property is a number,
 * a boolean, or a value from a fixed enum. Free text never gets through. No German or
 * English word, no example sentence, no name, no email, no photo data, no error message.
 * `track()` runs every property through `sanitizeProperties()`, which drops anything
 * that is not on the schema below, and any string longer than 40 characters.
 *
 * Analytics is off when EXPO_PUBLIC_POSTHOG_KEY is unset. It is also off in development
 * builds unless EXPO_PUBLIC_ANALYTICS_IN_DEV=true, so testers can switch it on for a test run.
 */
import PostHog from 'posthog-react-native';
import { THEMES, type ThemeId } from '../constants/Themes';

// ─── Catalogue ───────────────────────────────────────────────────────────────

export type SignInMethod = 'apple' | 'google' | 'email';
export type SignInFailReason = Extract<ErrorCode, 'cancelled' | 'no_token' | 'provider_error' | 'unknown'>;
export type UiLang = 'de' | 'en';
export type WordOriginKind = 'catalogue' | 'scan';

/** Server error codes (scan-words), plus client-side codes for failures the app detects itself. */
export const ERROR_CODES = [
  'consent_required',
  'rate_limited',
  'model_busy',
  'model_failed',
  'model_unparseable',
  'model_not_configured',
  'image_too_large',
  'lookup_required',
  'lookup_too_long',
  'invalid_token',
  'timeout',
  'no_response',
  'cancelled',
  'no_token',
  'provider_error',
  'capture_failed',
  'load_failed',
  'save_failed',
  'start_failed',
  'delete_failed',
  'network',
  'gate_unavailable', 'gate_explicit', 'gate_people', 'gate_no_text',
  'unknown',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Screens that can show an error to the learner. */
export const ERROR_AREAS = [
  'sign_in', 'deck', 'scan', 'my_words', 'test', 'progress', 'home', 'profile', 'onboarding', 'account',
] as const;
export type ErrorArea = (typeof ERROR_AREAS)[number];

const THEME_BANDS = [...new Set(THEMES.map((t) => t.band))];

export interface AnalyticsEventMap {
  app_opened: null;
  home_opened: null;
  sign_in_started: { method: SignInMethod };
  sign_in_completed: { method: SignInMethod };
  sign_in_failed: { method: SignInMethod; reason_code: SignInFailReason };
  sign_out: null;
  account_deleted: null;
  onboarding_completed: { levels_count: number };
  levels_changed: { levels_count: number };
  language_changed: { lang: UiLang };
  daily_goal_changed: { minutes: number };
  deck_opened: { load_ms: number };
  deck_shuffled: null;
  card_graded: { grade: number; is_new: boolean; origin: WordOriginKind; think_ms: number };
  session_completed: { cards: number; minutes: number; active_s: number };
  session_ended: { active_s: number };
  theme_opened: { theme_id: ThemeId; band: string };
  progress_opened: null;
  phrases_opened: null;
  leaderboard_opened: null;
  test_started: { size: number; mode: 'studied' | 'first_look'; load_ms: number };
  test_answered: { correct: boolean; think_ms: number };
  test_finished: { correct: number; total: number; perfect: boolean; duration_ms: number };
  scan_opened: null;
  scan_consent_changed: { granted: boolean };
  scan_photo_taken: { image_kb: number };
  scan_result: {
    candidates: number;
    catalogue: number;
    already_yours: number;
    duration_ms: number;
    prep_ms: number;
    gate_ms: number;
    network_ms: number;
    ok: boolean;
    error_code: ErrorCode | 'none';
  };
  scan_saved: { count: number };
  my_words_opened: null;
  word_looked_up: { found: 'catalogue' | 'candidate' | 'none' };
  word_added: { count: number };
  word_deleted: null;
  word_spoken: null;
  error_shown: { area: ErrorArea; error_code: ErrorCode };
  theme_changed: { theme_mode: 'system' | 'light' | 'dark' };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

// ─── Privacy gate ────────────────────────────────────────────────────────────

/** Longest string a property may carry. Anything longer is dropped, not truncated. */
export const MAX_STRING_LENGTH = 40;

type PropertySpec =
  | { kind: 'scalar' }
  | { kind: 'enum'; values: readonly string[] };

/**
 * Every property key that may be sent, and what its value may be. A key not listed here
 * is dropped. Numbers and booleans are 'scalar'; the only strings allowed are the values
 * of a fixed enum, so a word or a sentence cannot get through under any key.
 */
const SCHEMA: Record<string, PropertySpec> = {
  method: { kind: 'enum', values: ['apple', 'google', 'email'] },
  reason_code: { kind: 'enum', values: ['cancelled', 'no_token', 'provider_error', 'unknown'] },
  lang: { kind: 'enum', values: ['de', 'en'] },
  origin: { kind: 'enum', values: ['catalogue', 'scan'] },
  mode: { kind: 'enum', values: ['studied', 'first_look'] },
  theme_mode: { kind: 'enum', values: ['system', 'light', 'dark'] },
  found: { kind: 'enum', values: ['catalogue', 'candidate', 'none'] },
  theme_id: { kind: 'enum', values: THEMES.map((t) => t.id) },
  band: { kind: 'enum', values: THEME_BANDS },
  area: { kind: 'enum', values: ERROR_AREAS },
  error_code: { kind: 'enum', values: [...ERROR_CODES, 'none'] },
  grade: { kind: 'scalar' },
  is_new: { kind: 'scalar' },
  levels_count: { kind: 'scalar' },
  minutes: { kind: 'scalar' },
  cards: { kind: 'scalar' },
  size: { kind: 'scalar' },
  correct: { kind: 'scalar' },
  total: { kind: 'scalar' },
  perfect: { kind: 'scalar' },
  granted: { kind: 'scalar' },
  candidates: { kind: 'scalar' },
  catalogue: { kind: 'scalar' },
  already_yours: { kind: 'scalar' },
  duration_ms: { kind: 'scalar' },
  ok: { kind: 'scalar' },
  count: { kind: 'scalar' },
  // Timing and reliability. Milliseconds or seconds, never content.
  active_s: { kind: 'scalar' },
  load_ms: { kind: 'scalar' },
  think_ms: { kind: 'scalar' },
  prep_ms: { kind: 'scalar' },
  gate_ms: { kind: 'scalar' },
  network_ms: { kind: 'scalar' },
  image_kb: { kind: 'scalar' },
};

/**
 * Starts a stopwatch and returns a function that gives the elapsed milliseconds.
 * Use it instead of Date.now() so timings are monotonic and rounded the same way everywhere.
 */
export function timer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

export type SafeValue = number | boolean | string;

/**
 * Keeps only the properties the schema allows, with a value of the right kind.
 * Exported for tests; `track()` is the only caller in the app.
 */
export function sanitizeProperties(props: Record<string, unknown>): Record<string, SafeValue> {
  const out: Record<string, SafeValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!Object.prototype.hasOwnProperty.call(SCHEMA, key)) continue;
    const spec = SCHEMA[key];
    if (spec.kind === 'scalar') {
      if (typeof value === 'boolean') out[key] = value;
      else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
      continue;
    }
    if (
      typeof value === 'string' &&
      value.length <= MAX_STRING_LENGTH &&
      spec.values.includes(value)
    ) {
      out[key] = value;
    }
  }
  return out;
}

/** Maps any code from the server or the device onto the catalogue. Unknown codes become 'unknown'. */
export function toErrorCode(raw: unknown): ErrorCode {
  return typeof raw === 'string' && (ERROR_CODES as readonly string[]).includes(raw)
    ? (raw as ErrorCode)
    : 'unknown';
}

// ─── Client ──────────────────────────────────────────────────────────────────

const KEY = (process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '').trim();
const HOST = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '').trim() || 'https://eu.i.posthog.com';
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const DEV_ON = (process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV ?? '').trim() === 'true';

/** Session replay masking. Text, images and sandboxed views are masked on the phone before anything
 *  is uploaded. Taps and console logs are not recorded, because they can carry learner content. */
export const REPLAY_CONFIG = {
  maskAllTextInputs: true,
  maskAllImages: true,
  maskAllSandboxedViews: true,
  captureTouches: false,
  captureLog: false,
} as const;

/** Null when there is no key or this is a dev build. Every call below is then a no-op. */
const client: PostHog | null = (() => {
  if (!KEY || (IS_DEV && !DEV_ON)) return null;
  try {
    return new PostHog(KEY, {
      host: HOST,
      // The catalogue is the whole event list. Lifecycle events are not in it.
      captureAppLifecycleEvents: false,
      // Replay is off at setup and started only when the learner has agreed (see setReplayConsent).
      enableSessionReplay: false,
      sessionReplayConfig: { ...REPLAY_CONFIG },
    });
  } catch {
    return null;
  }
})();

/** Analytics must never break the app: any SDK failure is swallowed. */
function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    // Dropped silently on purpose.
  }
}

let identifiedAs: string | null = null;

/** Called with the Supabase user id only. The email is never sent. */
export function identify(userId: string): void {
  if (!client || identifiedAs === userId) return;
  identifiedAs = userId;
  safely(() => client.identify(userId));
}

/** Called on sign-out, so the next learner on this device starts a fresh identity. */
export function reset(): void {
  if (!client) return;
  identifiedAs = null;
  safely(() => {
    void client.stopSessionRecording();
    client.reset();
  });
}

/** Starts or stops session replay for this learner. Replay runs only while the learner has agreed. */
export function setReplayConsent(granted: boolean): void {
  if (!client) return;
  const c = client;
  // Development only: report whether the recorder is really active, to tell a device problem apart
  // from a project setting. Never logs session contents.
  void (async () => {
    try {
      if (granted) await c.startSessionRecording();
      else await c.stopSessionRecording();
      if (__DEV__) console.log('session replay', granted ? 'start' : 'stop', 'active:', await c.isSessionReplayActive());
    } catch (err) {
      if (__DEV__) console.warn('session replay error:', err instanceof Error ? err.message : String(err));
    }
  })();
}

type TrackArgs<E extends AnalyticsEventName> = AnalyticsEventMap[E] extends null
  ? []
  : [props: AnalyticsEventMap[E]];

/** Sends one catalogue event. Properties pass through the privacy gate first. */
export function track<E extends AnalyticsEventName>(event: E, ...args: TrackArgs<E>): void {
  if (!client) return;
  const raw = (args[0] ?? {}) as Record<string, unknown>;
  const props = sanitizeProperties(raw);
  safely(() => client.capture(event, props));
}
