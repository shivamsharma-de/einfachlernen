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
