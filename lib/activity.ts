import { supabase } from './supabase';

/** Daily usage tracking (PRD v2 §3.3).
 *
 *  Writes go through the `log_activity` RPC so two devices accumulating minutes
 *  on the same day cannot clobber each other with a read-modify-write. Streak is
 *  read from `current_streak()` — derived from consecutive active days, never a
 *  stored counter that could drift. */

export interface DailyActivity {
  day: string;
  minutes: number;
  cards_reviewed: number;
  xp_earned: number;
}

export const DAILY_MINUTES_GOAL = 15;

export async function logActivity(opts: {
  minutes?: number;
  cards?: number;
  xp?: number;
}): Promise<void> {
  const { error } = await supabase.rpc('log_activity', {
    p_minutes: Math.round(opts.minutes ?? 0),
    p_cards: opts.cards ?? 0,
    p_xp: opts.xp ?? 0,
  });
  if (error) console.warn('logActivity error:', error.message);
}

export async function fetchToday(userId: string): Promise<DailyActivity | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('daily_activity')
    .select('day, minutes, cards_reviewed, xp_earned')
    .eq('user_id', userId)
    .eq('day', today)
    .maybeSingle();

  if (error) {
    console.warn('fetchToday error:', error.message);
    return null;
  }
  return data as DailyActivity | null;
}

/** Last `days` of activity, oldest first — feeds the seven-day streak row. */
export async function fetchRecent(userId: string, days = 7): Promise<DailyActivity[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));

  const { data, error } = await supabase
    .from('daily_activity')
    .select('day, minutes, cards_reviewed, xp_earned')
    .eq('user_id', userId)
    .gte('day', since.toISOString().slice(0, 10))
    .order('day', { ascending: true });

  if (error || !data) {
    console.warn('fetchRecent error:', error?.message);
    return [];
  }
  return data as DailyActivity[];
}

export async function fetchStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('current_streak');
  if (error) {
    console.warn('fetchStreak error:', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

/** Wall-clock session timer.
 *
 *  Minutes are only flushed on `stop`, and a session shorter than a minute is
 *  dropped rather than rounded up to one — inflating the daily total would make
 *  the goal ring lie. */
export function createSessionTimer() {
  let startedAt: number | null = null;

  return {
    start() {
      if (startedAt === null) startedAt = Date.now();
    },
    /** Flushes elapsed minutes and resets. Safe to call when not started. */
    async stop(extra: { cards?: number; xp?: number } = {}): Promise<void> {
      const elapsedMs = startedAt === null ? 0 : Date.now() - startedAt;
      startedAt = null;
      const minutes = Math.floor(elapsedMs / 60_000);
      if (minutes === 0 && !extra.cards && !extra.xp) return;
      await logActivity({ minutes, ...extra });
    },
  };
}
