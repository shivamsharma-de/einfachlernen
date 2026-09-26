/**
 * Grammar line for the back of a deck card (PRD F3, card-content table).
 *
 * Pure formatting, no React — it lives here rather than in a component because
 * `components/**` belongs to the design agent and `GrammarLine` has not landed
 * yet. When it does, the screen swaps the inline renderer for the component and
 * this module can move behind it unchanged.
 *
 * The one rule that matters: a missing part is dropped, never printed. No
 * "undefined", no dangling " · ".
 */
import type { DeckWord, WordEnrichment } from '../types/contracts';
import type { WordType } from '../types';

/** `forms` is `Record<string, unknown>` in the contract and free-form JSON in
 *  the database, so every read is guarded rather than cast. */
function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const text = asText(value)?.toLowerCase();
  return text === 'true' || text === 'ja' || text === '1' || text === 'trennbar';
}

type GrammarKey =
  | 'plural' | 'genitive' | 'auxiliary' | 'past_participle'
  | 'separable' | 'comparative' | 'superlative';

/** `de_words.forms` first, AI grammar as the fallback (PRD F3: `forms` ∪ `de_word_ai.grammar`). */
function pick(word: DeckWord, enrichment: WordEnrichment | null, key: GrammarKey): unknown {
  const forms = (word.forms ?? {}) as Record<string, unknown>;
  const seeded = forms[key];
  if (asText(seeded) !== null || typeof seeded === 'boolean') return seeded;
  return enrichment?.grammar?.[key];
}

/** `haben` → `hat`, so a verb reads "hat gemacht · haben" rather than "haben gemacht". */
const AUXILIARY_THIRD_PERSON: Record<string, string> = { haben: 'hat', sein: 'ist' };

export function grammarLine(word: DeckWord, enrichment: WordEnrichment | null = null): string | null {
  const text = (key: GrammarKey) => asText(pick(word, enrichment, key));
  const parts: string[] = [];

  switch (word.word_type) {
    case 'noun': {
      if (word.article) parts.push(word.article);
      const plural = text('plural');
      if (plural) parts.push(`Pl. ${plural}`);
      const genitive = text('genitive');
      if (genitive) parts.push(`Gen. ${genitive}`);
      break;
    }
    case 'verb': {
      const participle = text('past_participle');
      const auxiliary = text('auxiliary');
      if (participle) {
        const conjugated = auxiliary ? AUXILIARY_THIRD_PERSON[auxiliary.toLowerCase()] : undefined;
        parts.push(conjugated ? `${conjugated} ${participle}` : participle);
      }
      if (auxiliary) parts.push(auxiliary);
      if (asFlag(pick(word, enrichment, 'separable'))) parts.push('trennbar');
      break;
    }
    case 'adjective': {
      const comparative = text('comparative');
      if (comparative) parts.push(comparative);
      const superlative = text('superlative');
      // The catalogue stores both "am größten" and bare "größten"; normalise.
      if (superlative) parts.push(superlative.startsWith('am ') ? superlative : `am ${superlative}`);
      break;
    }
    default:
      // Adverbs, particles and the rest carry no inflection worth a line.
      break;
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

const WORD_TYPE_DE: Record<WordType, string> = {
  noun: 'Nomen',
  verb: 'Verb',
  adjective: 'Adjektiv',
  adverb: 'Adverb',
  phrase: 'Wendung',
  conjunction: 'Konjunktion',
  preposition: 'Präposition',
  pronoun: 'Pronomen',
  number: 'Zahlwort',
  interjection: 'Ausruf',
};

export function wordTypeLabel(type: WordType): string {
  return WORD_TYPE_DE[type] ?? type;
}

/** The example pair to show: AI examples when they arrived, catalogue otherwise.
 *  Never empty-checks into a blank block — callers get `[]` and render nothing. */
export function examplesFor(
  word: DeckWord,
  enrichment: WordEnrichment | null,
): { de: string; en: string }[] {
  const fromAi = (enrichment?.examples ?? []).filter((e) => asText(e?.de) !== null);
  if (fromAi.length > 0) {
    return fromAi.slice(0, 2).map((e) => ({ de: e.de.trim(), en: asText(e.en) ?? '' }));
  }
  const de = asText(word.example_de);
  if (!de) return [];
  return [{ de, en: asText(word.example_en) ?? '' }];
}

/** 3186 → "3.186". Intl is not reliably present in Hermes, so this is manual. */
export function formatCountDe(n: number): string {
  const digits = Math.max(0, Math.round(n)).toString();
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '.';
    out += digits[i];
  }
  return out;
}
