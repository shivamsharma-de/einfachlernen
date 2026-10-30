import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { localISODate } from './localdate';

/** Daily usage and study sessions (PRD F6). Everything here is stored on the server
 *  under the user's id, so a reinstall restores it. The phone holds no stat. */

export interface DailyActivity {
  day: string;
  minutes: number;
  cards_reviewed: number;
  xp_earned: number;
  seconds: number;
}

export const DAILY_MINUTES_GOAL = 15;

/** A study session ends after this long without a grade or time update (plan §2). */
const SESSION_IDLE_MS = 10 * 60_000;
/** How often foreground time is sent while a study screen is open. */
const TIME_UPDATE_MS = 30_000;

// ─── study session id ─────────────────────────────────────────────────────────
// Grades and time for one sitting share a session id, generated on the device.
// The server creates the session row the first time it sees the id.

let session: { id: string; lastActive: number } | null = null;

/** The session that new grades and time belong to. Starts a new one after idle time. */
export function currentStudySessionId(): string {
  const now = Date.now();
  if (!session || now - session.lastActive > SESSION_IDLE_MS) {
    session = { id: Crypto.randomUUID(), lastActive: now };
  }
  session.lastActive = now;
  return session.id;
}

// ─── reads (server-computed, device-local date) ───────────────────────────────

export async function fetchToday(_userId?: string): Promise<DailyActivity | null> {
  const { data, error } = await supabase.rpc('activity_summary', { p_today: localISODate() });
  if (error) {
    console.warn('fetchToday error:', error.message);
    return null;
  }
  const t = (data as { today?: Record<string, number> } | null)?.today;
  if (!t) return null;
  const seconds = Number(t.seconds ?? 0);
  return {
    day: localISODate(),
    // Minutes are derived from seconds, so a short session still counts toward the goal.
    minutes: Math.max(Number(t.minutes ?? 0), Math.floor(seconds / 60)),
    cards_reviewed: Number(t.cards ?? 0),
    xp_earned: Number(t.xp ?? 0),
    seconds,
  };
}

/** Last `days` of activity, oldest first, for the seven-day row. */
export async function fetchRecent(_userId?: string, days = 7): Promise<DailyActivity[]> {
  const { data, error } = await supabase.rpc('activity_summary', { p_today: localISODate() });
  if (error) {
    console.warn('fetchRecent error:', error.message);
    return [];
  }
  const rows = ((data as { last_7_days?: Record<string, number | string>[] } | null)?.last_7_days ?? []);
  return rows.slice(-days).map((r) => ({
    day: String(r.day),
    minutes: Math.floor(Number(r.seconds ?? 0) / 60),
    cards_reviewed: Number(r.cards ?? 0),
    xp_earned: Number(r.xp ?? 0),
    seconds: Number(r.seconds ?? 0),
  }));
}

export async function fetchStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('current_streak', { p_today: localISODate() });
  if (error) {
    console.warn('fetchStreak error:', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

// ─── time on task ─────────────────────────────────────────────────────────────

/** Measures foreground time on a study screen and sends it to the server.
 *
 *  Only the foreground counts: time in the background is excluded. The running total
 *  is sent every 30 seconds, and again when the app leaves the foreground or the screen
 *  closes. The server keeps the largest value it has seen, so a late or repeated
 *  update can never reduce time or double count it. */
export function createSessionTimer() {
  let foregroundSince: number | null = null;
  let accumulatedMs = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let subscription: { remove: () => void } | null = null;

  const totalSeconds = () =>
    Math.floor((accumulatedMs + (foregroundSince !== null ? Date.now() - foregroundSince : 0)) / 1000);

  async function send(): Promise<void> {
    const seconds = totalSeconds();
    if (seconds <= 0) return;
    const { error } = await supabase.rpc('touch_session', {
      p_session_id: currentStudySessionId(),
      p_kind: 'review',
      p_active_seconds: seconds,
      p_local_day: localISODate(),
      p_levels: [],
    });
    if (error) console.warn('touch_session error:', error.message);
  }

  function pause() {
    if (foregroundSince !== null) {
      accumulatedMs += Date.now() - foregroundSince;
      foregroundSince = null;
    }
  }

  return {
    start() {
      if (foregroundSince === null) foregroundSince = Date.now();
      if (interval === null) interval = setInterval(() => { void send(); }, TIME_UPDATE_MS);
      if (subscription === null) {
        subscription = AppState.addEventListener('change', (state) => {
          if (state === 'active') {
            if (foregroundSince === null) foregroundSince = Date.now();
          } else {
            pause();
            void send();
          }
        });
      }
    },
    /** Foreground seconds so far in this session. Read-only; sends nothing. */
    activeSeconds: totalSeconds,
    /** Stops the clock and sends the final total. Extra arguments are ignored:
     *  the server now owns cards and XP, so only time is sent from here. */
    async stop(_extra?: unknown): Promise<void> {
      pause();
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
      subscription?.remove();
      subscription = null;
      await send();
    },
  };
}
