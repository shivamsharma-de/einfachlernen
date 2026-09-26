/**
 * Real word counts per CEFR level for the level-selection screen (PRD F2.1),
 * plus the share of each level that is `level_source='estimated'` so F2.5's
 * "Wortliste geschätzt" note marks genuine uncertainty.
 *
 * Why not `fetchWordCountsByLevel()` from `lib/db.ts`: it counts the rows of
 * `fetchAllWords()`, which is a plain `select('*')` on `de_words`. PostgREST
 * caps that at `max_rows = 1000` (supabase/config.toml), so against a 9,752-row
 * catalogue it silently returns 1,000 rows, caches them for 24h, and the picker
 * would claim the whole catalogue holds a thousand words. It also cannot see
 * `review_status` filtering, so it would count draft rows the learner never
 * gets served.
 *
 * So this counts with `head: true, count: 'exact'` against the `deck_words`
 * view — the same view the deck reads, already filtered to
 * `review_status='reviewed'`. Twelve header-only requests, no rows, cached for
 * a day. It is the one place in `app/**` + `hooks/**` that touches Supabase
 * directly; there is no counting function in the `lib/api.ts` contract yet and
 * one is requested in docs/agents/status/frontend.md. When it lands, delete
 * `loadCounts` and call it instead — the hook's shape does not change.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { CEFRLevel } from '../types';

export const CEFR_LEVELS: readonly CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface LevelCount {
  /** Words at this level the learner can actually be served. */
  total: number;
  /** How many of those carry `level_source='estimated'`. */
  estimated: number;
}

export type LevelCounts = Record<CEFRLevel, LevelCount>;

const CACHE_KEY = 'level_counts_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const EMPTY: LevelCounts = {
  A1: { total: 0, estimated: 0 }, A2: { total: 0, estimated: 0 },
  B1: { total: 0, estimated: 0 }, B2: { total: 0, estimated: 0 },
  C1: { total: 0, estimated: 0 }, C2: { total: 0, estimated: 0 },
};

/** A level whose words are mostly estimates gets the note (PRD F2.5). */
export function isMostlyEstimated(count: LevelCount | undefined): boolean {
  if (!count || count.total === 0) return false;
  return count.estimated / count.total > 0.5;
}

async function countRows(level: CEFRLevel, estimatedOnly: boolean): Promise<number> {
  let query = supabase
    .from('deck_words')
    .select('id', { count: 'exact', head: true })
    .eq('level', level);
  if (estimatedOnly) query = query.eq('level_source', 'estimated');

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function loadCounts(): Promise<LevelCounts> {
  const pairs = await Promise.all(
    CEFR_LEVELS.map(async (level) => {
      const [total, estimated] = await Promise.all([
        countRows(level, false),
        countRows(level, true),
      ]);
      return [level, { total, estimated }] as const;
    }),
  );
  return pairs.reduce((acc, [level, count]) => ({ ...acc, [level]: count }), { ...EMPTY });
}

async function readCache(): Promise<LevelCounts | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as { ts: number; data: LevelCounts };
    if (Date.now() - envelope.ts > CACHE_TTL_MS) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

async function writeCache(data: LevelCounts): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // A cache miss next launch is the whole cost. Not worth surfacing.
  }
}

export function useLevelCounts() {
  const [counts, setCounts] = useState<LevelCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async (skipCache = false) => {
    setLoading(true);
    setError(null);

    if (!skipCache) {
      const cached = await readCache();
      if (cached && alive.current) {
        setCounts(cached);
        setLoading(false);
        return;
      }
    }

    try {
      const fresh = await loadCounts();
      if (!alive.current) return;
      setCounts(fresh);
      void writeCache(fresh);
    } catch {
      if (!alive.current) return;
      // The list still renders — a missing count must not block choosing a level.
      setError('Wortzahlen nicht verfügbar');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; };
  }, [load]);

  return { counts, loading, error, reload: () => load(true) };
}
