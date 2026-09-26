-- 006_v3_decks_scan_content.sql
-- PRD v3 §6 / CONTRACTS §1. Idempotent, like 001–005.
--
-- Adds: derived-level metadata on de_words, daily_new_cards, word_progress.added_via,
-- the private user_words table for scan imports, the deck_words read view, and the
-- next_new_words RPC.

BEGIN;

-- ── de_words ──────────────────────────────────────────────────────────────
-- level_source has no 'official' value: there is no licensed exam wordlist in
-- this project (PRD D12). 'derived' means the word cleared the ensemble
-- agreement gate; 'estimated' means the signals disagreed. Defaults are the
-- conservative ones so a row that never went through the pipeline cannot reach
-- a learner claiming confidence it did not earn.
ALTER TABLE public.de_words
  ADD COLUMN IF NOT EXISTS level_source     text NOT NULL DEFAULT 'estimated',
  ADD COLUMN IF NOT EXISTS level_confidence real,
  ADD COLUMN IF NOT EXISTS review_status    text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS frequency_rank   integer;

DO $$ BEGIN
  ALTER TABLE public.de_words
    ADD CONSTRAINT de_words_level_source_chk CHECK (level_source IN ('derived','estimated'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.de_words
    ADD CONSTRAINT de_words_review_status_chk CHECK (review_status IN ('draft','reviewed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.de_words
    ADD CONSTRAINT de_words_level_conf_chk
    CHECK (level_confidence IS NULL OR level_confidence BETWEEN 0 AND 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Generated columns cannot be added with IF NOT EXISTS + GENERATED in one step
-- on every PG version; guard it explicitly.
DO $$ BEGIN
  ALTER TABLE public.de_words
    ADD COLUMN lemma_key text GENERATED ALWAYS AS (lower(german)) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS de_words_lemma_key_idx  ON public.de_words (lemma_key);
CREATE INDEX IF NOT EXISTS de_words_level_rank_idx ON public.de_words (level, frequency_rank);

-- ── profiles ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_new_cards integer NOT NULL DEFAULT 10;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_daily_new_cards_chk CHECK (daily_new_cards BETWEEN 1 AND 50);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── word_progress ─────────────────────────────────────────────────────────
ALTER TABLE public.word_progress
  ADD COLUMN IF NOT EXISTS added_via text NOT NULL DEFAULT 'level';

DO $$ BEGIN
  ALTER TABLE public.word_progress
    ADD CONSTRAINT word_progress_added_via_chk CHECK (added_via IN ('level','scan','manual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── scan_results ──────────────────────────────────────────────────────────
ALTER TABLE public.scan_results
  ADD COLUMN IF NOT EXISTS page_count integer NOT NULL DEFAULT 1;

-- ── user_words ────────────────────────────────────────────────────────────
-- Private words created from scans (PRD D11). id prefix 'u_' so
-- word_progress.word_id (text, no FK) can reference either table unambiguously.
CREATE TABLE IF NOT EXISTS public.user_words (
  id              text PRIMARY KEY DEFAULT ('u_' || gen_random_uuid()),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  german          text NOT NULL,
  article         text CHECK (article IN ('der','die','das')),
  word_type       text NOT NULL,
  english         text NOT NULL,
  level           text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  forms           jsonb NOT NULL DEFAULT '{}',
  example_de      text,
  example_en      text,
  source_scan_id  uuid REFERENCES public.scan_results(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  lemma_key       text GENERATED ALWAYS AS (lower(german)) STORED,
  UNIQUE (user_id, lemma_key)
);

CREATE INDEX IF NOT EXISTS user_words_user_idx      ON public.user_words (user_id);
CREATE INDEX IF NOT EXISTS user_words_lemma_key_idx ON public.user_words (lemma_key);

ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_words_select_own ON public.user_words;
CREATE POLICY user_words_select_own ON public.user_words
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_words_insert_own ON public.user_words;
CREATE POLICY user_words_insert_own ON public.user_words
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_words_update_own ON public.user_words;
CREATE POLICY user_words_update_own ON public.user_words
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_words_delete_own ON public.user_words;
CREATE POLICY user_words_delete_own ON public.user_words
  FOR DELETE USING (auth.uid() = user_id);

-- ── deck_words ────────────────────────────────────────────────────────────
-- One read shape for the client. security_invoker so the caller's RLS applies
-- to user_words.
CREATE OR REPLACE VIEW public.deck_words WITH (security_invoker = true) AS
  SELECT id, german, article, word_type, english, level,
         level_source, level_confidence, forms, example_de, example_en,
         frequency_rank, thema, 'catalogue'::text AS origin
    FROM public.de_words
   WHERE review_status = 'reviewed'
  UNION ALL
  SELECT id, german, article, word_type, english, level,
         'estimated'::text, NULL::real, forms, example_de, example_en,
         NULL::integer, NULL::text, 'scan'::text
    FROM public.user_words
   WHERE user_id = auth.uid();

-- ── next_new_words ────────────────────────────────────────────────────────
-- Words at p_level the caller has no progress row for, most useful first.
CREATE OR REPLACE FUNCTION public.next_new_words(p_level text, p_limit int)
RETURNS SETOF public.deck_words
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT d.*
    FROM public.deck_words d
   WHERE d.level = p_level
     AND NOT EXISTS (
           SELECT 1 FROM public.word_progress wp
            WHERE wp.word_id = d.id AND wp.user_id = auth.uid())
   ORDER BY d.frequency_rank NULLS LAST, d.id
   LIMIT p_limit;
$$;

-- ── backfill ──────────────────────────────────────────────────────────────
-- The 168 hand-authored rows predate the pipeline. They re-enter through it
-- like everything else, so they start as unreviewed drafts.
UPDATE public.de_words
   SET review_status = 'draft', level_source = 'estimated'
 WHERE frequency_rank IS NULL AND level_confidence IS NULL;

COMMIT;
