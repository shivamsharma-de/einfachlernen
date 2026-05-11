export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordType = 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'conjunction' | 'preposition' | 'pronoun' | 'number' | 'interjection';
export type Article = 'der' | 'die' | 'das';
export type Register = 'formal' | 'informal' | 'neutral';
export type UsageContext = 'spoken' | 'written' | 'both';

export interface Word {
  id: string;
  level: CEFRLevel;
  category: string;
  word_type: WordType;
  german: string;
  article: Article | null;
  english: string;
  pronunciation: string | null;
  cultural_context: string | null;
  synonyms: string[];
  antonyms: string[];
  forms: Record<string, unknown>;
  hint: string | null;
  example_de: string | null;
  example_en: string | null;
  distractors: string[];
  source: string;
}

export interface Phrase {
  id: string;
  level: CEFRLevel;
  category: string;
  register: Register;
  usage_context: UsageContext;
  german: string;
  english: string;
  example_de: string | null;
  example_en: string | null;
  cultural_context: string | null;
  tip: string | null;
}
