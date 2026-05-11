import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Word, Phrase, CEFRLevel } from '../types';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type CacheEnvelope<T> = { ts: number; data: T };

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const envelope: CacheEnvelope<T> = JSON.parse(raw);
    if (Date.now() - envelope.ts > CACHE_TTL_MS) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { ts: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.warn('Cache write failed:', err);
  }
}

async function fetchWithCache<T>(
  cacheKey: string,
  table: string,
  label: string,
): Promise<T[]> {
  const cached = await readCache<T[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.from(table).select('*');

  if (error || !data) {
    console.warn(`fetch ${label} error:`, error?.message);
    return [];
  }

  await writeCache(cacheKey, data);
  return data as T[];
}

// ─── Words ───────────────────────────────────────────────────────────────────

const WORDS_CACHE_KEY = 'de_words_v1';

export async function fetchAllWords(): Promise<Word[]> {
  return fetchWithCache<Word>(WORDS_CACHE_KEY, 'de_words', 'words');
}

export async function fetchWordsByLevel(levels: CEFRLevel[]): Promise<Word[]> {
  const all = await fetchAllWords();
  return all.filter(w => levels.includes(w.level));
}

export async function clearWordsCache(): Promise<void> {
  await AsyncStorage.removeItem(WORDS_CACHE_KEY);
}

// ─── Phrases ─────────────────────────────────────────────────────────────────

const PHRASES_CACHE_KEY = 'de_redemittel_v1';

export async function fetchAllPhrases(): Promise<Phrase[]> {
  return fetchWithCache<Phrase>(PHRASES_CACHE_KEY, 'de_redemittel', 'phrases');
}

export async function clearPhrasesCache(): Promise<void> {
  await AsyncStorage.removeItem(PHRASES_CACHE_KEY);
}

// ─── Word counts per level (for home screen) ─────────────────────────────────

export async function fetchWordCountsByLevel(): Promise<Record<CEFRLevel, number>> {
  const all = await fetchAllWords();
  return all.reduce((acc, w) => {
    acc[w.level] = (acc[w.level] ?? 0) + 1;
    return acc;
  }, {} as Record<CEFRLevel, number>);
}
