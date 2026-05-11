-- German content tables: words + redemittel
-- Run AFTER 001_initial_schema.sql

-- ─── DE_WORDS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.de_words (
  id               text PRIMARY KEY,
  level            text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  category         text NOT NULL,
  word_type        text NOT NULL CHECK (word_type IN (
                     'noun','verb','adjective','adverb','phrase',
                     'conjunction','preposition','pronoun','number','interjection')),

  -- Core
  german           text NOT NULL,
  article          text CHECK (article IN ('der','die','das')),
  english          text NOT NULL,
  pronunciation    text,               -- IPA

  -- Rich content
  cultural_context text,
  synonyms         text[] DEFAULT '{}',
  antonyms         text[] DEFAULT '{}',

  -- Word-type-specific morphology (JSONB)
  -- noun:      { "plural": "Häuser",  "genitive": "des Hauses" }
  -- verb:      { "auxiliary": "haben", "past_participle": "gemacht",
  --              "simple_past": "machte", "separable": false,
  --              "reflexive": false,
  --              "conjugation": { "ich":"mache","du":"machst","er":"macht",
  --                               "wir":"machen","ihr":"macht","sie":"machen" } }
  -- adjective: { "comparative": "größer", "superlative": "am größten" }
  forms            jsonb DEFAULT '{}',

  -- Learning
  hint             text,
  example_de       text,
  example_en       text,
  distractors      text[] DEFAULT '{}',  -- 3 wrong English answers for quiz

  -- Meta
  source           text DEFAULT 'goethe',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS de_words_level_idx     ON public.de_words (level);
CREATE INDEX IF NOT EXISTS de_words_category_idx  ON public.de_words (category);
CREATE INDEX IF NOT EXISTS de_words_type_idx      ON public.de_words (word_type);

-- ─── DE_REDEMITTEL ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.de_redemittel (
  id               text PRIMARY KEY,
  level            text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  category         text NOT NULL,
  register         text NOT NULL CHECK (register IN ('formal','informal','neutral')),
  usage_context    text NOT NULL CHECK (usage_context IN ('spoken','written','both')),

  german           text NOT NULL,
  english          text NOT NULL,
  example_de       text,
  example_en       text,
  cultural_context text,
  tip              text,

  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS de_redemittel_level_idx    ON public.de_redemittel (level);
CREATE INDEX IF NOT EXISTS de_redemittel_category_idx ON public.de_redemittel (category);
