import { supabase } from './supabase';

/** Client side of the AI enrichment contract (PRD v2 §4.1).
 *
 *  The app never talks to Anthropic directly — the key lives in the Edge
 *  Function (D5). This module is a thin typed wrapper over that call. */

export interface WordGrammar {
  plural: string | null;
  genitive: string | null;
  auxiliary: string | null;
  past_participle: string | null;
  comparative: string | null;
  superlative: string | null;
}

export interface WordExample {
  de: string;
  en: string;
}

export interface WordEnrichment {
  meaning: string;
  description: string;
  examples: WordExample[];
  grammar: WordGrammar;
  cached?: boolean;
}

export type EnrichmentResult =
  | { ok: true; data: WordEnrichment }
  | { ok: false; error: string };

/** Fetch (or generate) the AI entry for a word.
 *
 *  Returns a result object rather than throwing: every caller is a screen that
 *  must stay usable when enrichment is unavailable — the word's seeded
 *  `english`, `example_de` and `forms` are always there as a fallback. */
export async function enrichWord(wordId: string): Promise<EnrichmentResult> {
  const { data, error } = await supabase.functions.invoke<WordEnrichment>('word-ai', {
    body: { word_id: wordId },
  });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'empty_response' };
  return { ok: true, data };
}

/** Read the cache directly, without risking a generation call. Used where a
 *  screen wants enrichment only if it is already free (e.g. a list row). */
export async function readCachedEnrichment(wordId: string): Promise<WordEnrichment | null> {
  const { data, error } = await supabase
    .from('de_word_ai')
    .select('meaning, description, examples, grammar')
    .eq('word_id', wordId)
    .maybeSingle();

  if (error || !data) return null;
  return { ...(data as WordEnrichment), cached: true };
}
