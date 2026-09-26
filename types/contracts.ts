/**
 * Shared types between the four parallel agents.
 *
 * Committed verbatim from docs/agents/CONTRACTS.md §3 during bootstrap.
 * LEAD-OWNED: no agent may edit this file or change a shape here. Need a
 * change? Write it under "Contract change requests" in your status file
 * (docs/agents/status/<agent>.md) and keep working against the current shape.
 */
import type { Article, CEFRLevel, WordType } from './index';

export type LevelSource = 'official' | 'estimated';
export type WordOrigin = 'catalogue' | 'scan';
export type Grade = 0 | 1 | 2 | 3; // Nochmal | Schwer | Gut | Leicht

export interface ExampleSentence { de: string; en: string }

/** Row of the `deck_words` view. */
export interface DeckWord {
  id: string;                 // de_words id, or 'u_…' for user_words
  german: string;
  article: Article | null;
  word_type: WordType;
  english: string;
  level: CEFRLevel;
  level_source: LevelSource;
  forms: Record<string, unknown>;
  example_de: string | null;
  example_en: string | null;
  frequency_rank: number | null;
  thema: string | null;
  origin: WordOrigin;
}

export interface WordEnrichment {
  meaning: string;
  description: string | null;
  examples: ExampleSentence[];                  // exactly 2 when present
  grammar: Partial<Record<'plural' | 'genitive' | 'auxiliary' | 'past_participle'
                        | 'separable' | 'comparative' | 'superlative', string>>;
}

/** Structurally identical to SRSState in lib/srs.ts. */
export interface SRSSnapshot { repetitions: number; intervalDays: number; easeFactor: number; lapses: number }

export interface DeckCard {
  word: DeckWord;
  enrichment: WordEnrichment | null;            // null until loaded; UI must render without it
  srs: SRSSnapshot;
  isNew: boolean;
  intervals: readonly [string, string, string, string]; // labels from lib/srs.ts previewIntervals(), feed GradeRow as-is
}

export interface DeckSession {
  id: string;                                   // `${userId}:${YYYY-MM-DD}:${n}`
  seed: number;
  queue: DeckCard[];
  position: number;
  stats: { due: number; new: number; reviewed: number };
}

export interface ScanCandidate {
  key: string;                                  // stable within a scan: lemma_key
  german: string;                               // lemma
  surface: string;                              // as seen on the page
  article: Article | null;
  word_type: WordType | 'other';
  english: string;
  level: CEFRLevel;
  level_source: LevelSource;                    // 'official' if matched in catalogue
  origin: 'catalogue' | 'new';
  word_id: string | null;                       // de_words id when origin='catalogue'
  example_de: string | null;
  example_en: string | null;
  page: number;                                 // 1-based, first page it appeared on
}

export interface ScanResponse {
  scan_id: string;
  pages: number;
  candidates: ScanCandidate[];                  // only relevant words (PRD D10)
  counts: { total_detected: number; already_in_deck: number; below_level: number; unreadable: number };
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string /* German, user-facing */ };
