import { supabase } from './supabase';
import type { CEFRLevel } from '../types/index';

/** The learner's own dictionary. Same fields as a master word (de_words), read under RLS,
 *  so a learner only ever sees their own rows. */
export interface PersonalWord {
  id: string;
  german: string;
  article: string | null;
  word_type: string;
  english: string;
  level: CEFRLevel;
  example_de: string | null;
  example_en: string | null;
  synonyms: string[];
  uncertain: boolean;
  meaning_source: 'ai' | 'user';
  created_at: string;
}

const COLUMNS =
  'id, german, article, word_type, english, level, example_de, example_en, synonyms, uncertain, meaning_source, created_at';

export async function fetchMyWords(): Promise<{ ok: true; data: PersonalWord[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('user_words')
    .select(COLUMNS)
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: 'Wörter konnten nicht geladen werden.' };
  return { ok: true, data: (data ?? []) as PersonalWord[] };
}

/** Removes one private word and its progress. Catalogue words are refused by the server. */
export async function deleteMyWord(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('delete_user_word', { p_id: id });
  if (error) return { ok: false, error: 'Löschen fehlgeschlagen. Versuche es noch einmal.' };
  if (!data) return { ok: false, error: 'Dieses Wort kann nicht gelöscht werden.' };
  return { ok: true };
}

/** One row in the combined dictionary view. `source` says whose word it is. */
export interface DictionaryEntry {
  id: string;
  source: 'catalogue' | 'personal';
  german: string;
  article: string | null;
  word_type: string;
  english: string;
  level: CEFRLevel;
  example_de: string | null;
  example_en: string | null;
  synonyms: string[];
}

/** Characters that would change the filter's meaning are removed. */
export function cleanQuery(raw: string): string {
  return raw.replace(/[%_,()*\\"]/g, ' ').replace(/\s+/g, ' ').trim();
}

const ENTRY_LIMIT = 40;

/** The learner's own words and the master dictionary, searched together. An empty query
 *  lists the learner's words first, then the most frequent master words. */
export async function searchDictionary(
  raw: string,
): Promise<{ ok: true; data: DictionaryEntry[] } | { ok: false; error: string }> {
  const query = cleanQuery(raw);
  const pattern = `%${query}%`;

  const personalQuery = supabase
    .from('user_words')
    .select('id, german, article, word_type, english, level, example_de, example_en, synonyms')
    .order('german', { ascending: true })
    .limit(ENTRY_LIMIT);
  const catalogueQuery = supabase
    .from('deck_words')
    .select('id, german, article, word_type, english, level, example_de, example_en, synonyms')
    .eq('origin', 'catalogue')
    .order('frequency_rank', { ascending: true, nullsFirst: false })
    .limit(ENTRY_LIMIT);

  const [personal, catalogue] = await Promise.all([
    query ? personalQuery.or(`german.ilike.${pattern},english.ilike.${pattern}`) : personalQuery,
    query ? catalogueQuery.or(`german.ilike.${pattern},english.ilike.${pattern}`) : catalogueQuery,
  ]);
  if (personal.error || catalogue.error) return { ok: false, error: 'Suche fehlgeschlagen. Versuche es noch einmal.' };

  const toEntry = (row: Record<string, unknown>, source: DictionaryEntry['source']): DictionaryEntry => ({
    id: String(row.id),
    source,
    german: String(row.german),
    article: (row.article as string | null) ?? null,
    word_type: String(row.word_type),
    english: String(row.english),
    level: row.level as CEFRLevel,
    example_de: (row.example_de as string | null) ?? null,
    example_en: (row.example_en as string | null) ?? null,
    synonyms: (row.synonyms as string[] | null) ?? [],
  });

  return {
    ok: true,
    data: [
      ...(personal.data ?? []).map((r) => toEntry(r as Record<string, unknown>, 'personal')),
      ...(catalogue.data ?? []).map((r) => toEntry(r as Record<string, unknown>, 'catalogue')),
    ],
  };
}

/** Cumulative totals for the learner, across all scans: words saved to the personal dictionary, and
 *  words detected on pages (summed over every scan). Not limited to one session. */
export async function fetchScanTotals(): Promise<{ ok: true; saved: number; detected: number } | { ok: false }> {
  const [saved, scans] = await Promise.all([
    supabase.from('user_words').select('id', { count: 'exact', head: true }),
    supabase.from('scan_results').select('total_detected'),
  ]);
  if (saved.error || scans.error) return { ok: false };
  const detected = (scans.data ?? []).reduce((sum, row) => sum + Number(row.total_detected ?? 0), 0);
  return { ok: true, saved: saved.count ?? 0, detected };
}
