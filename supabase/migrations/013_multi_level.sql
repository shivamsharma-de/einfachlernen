-- 013_multi_level.sql
--
-- A learner can study several levels at once (e.g. A1 + B1). New cards are drawn
-- from all selected levels together, ordered by the shared frequency rank, so the
-- most useful words come first regardless of level.
--
--   profiles.levels      the selected levels (source of truth for the deck)
--   profiles.cefr_level  kept in step as the LOWEST selected level, so anything
--                        that still reads a single level gets a sensible default
--
-- The single-level functions are replaced by array versions. Replacing (rather
-- than adding alongside) means nothing can silently keep using the old behaviour.
--
-- Idempotent.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS levels text[] NOT NULL DEFAULT ARRAY['A1']::text[];

-- Backfill from the single level the learner already has.
UPDATE public.profiles
   SET levels = ARRAY[cefr_level]::text[]
 WHERE levels IS NULL OR levels = ARRAY['A1']::text[] AND cefr_level <> 'A1';

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_levels_chk CHECK (
      cardinality(levels) BETWEEN 1 AND 6
      AND levels <@ ARRAY['A1','A2','B1','B2','C1','C2']::text[]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New cards from the selected levels, interleaved.
-- A single global frequency order would show every A1 word before any B1 word:
-- the common words are almost all A1, so the global order is lowest-first in
-- practice. Instead each level is ranked on its own, and the lists are merged
-- by that within-level rank, so every selected level contributes its most useful
-- words in turn. Within one level the order is still frequency order.
DROP FUNCTION IF EXISTS public.next_new_words(text, int);
CREATE OR REPLACE FUNCTION public.next_new_words(p_levels text[], p_limit int)
RETURNS SETOF public.deck_words
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH candidates AS (
    SELECT d.*,
           row_number() OVER (PARTITION BY d.level
                              ORDER BY d.frequency_rank NULLS LAST, d.id) AS level_rank
      FROM public.deck_words d
     WHERE d.level = ANY (p_levels)
       AND d.word_type NOT IN ('pronoun', 'conjunction', 'preposition', 'number', 'interjection')
       AND NOT EXISTS (
             SELECT 1 FROM public.word_progress wp
              WHERE wp.word_id = d.id AND wp.user_id = auth.uid())
  )
  SELECT c.id, c.german, c.article, c.word_type, c.english, c.level, c.level_source,
         c.level_confidence, c.forms, c.example_de, c.example_en, c.frequency_rank,
         c.thema, c.origin
    FROM candidates c
   ORDER BY c.level_rank, c.frequency_rank NULLS LAST, c.id
   LIMIT p_limit;
$$;

-- Theme shelf across the selected levels.
DROP FUNCTION IF EXISTS public.level_themes(text, date);
CREATE OR REPLACE FUNCTION public.level_themes(p_levels text[], p_today date)
RETURNS TABLE (thema text, total bigint, started bigint, due bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH served AS (
    SELECT COALESCE(d.thema, 'Allgemein') AS thema, d.id
      FROM public.deck_words d
     WHERE d.level = ANY (p_levels)
  ),
  mine AS (
    SELECT wp.word_id, wp.next_review_at, wp.mastered
      FROM public.word_progress wp
     WHERE wp.user_id = auth.uid()
  )
  SELECT s.thema,
         count(*)                                                        AS total,
         count(m.word_id)                                                AS started,
         count(*) FILTER (WHERE m.word_id IS NOT NULL
                            AND NOT m.mastered
                            AND m.next_review_at <= p_today)             AS due
    FROM served s
    LEFT JOIN mine m ON m.word_id = s.id
   GROUP BY s.thema
   ORDER BY count(*) DESC, s.thema;
$$;

REVOKE ALL ON FUNCTION public.next_new_words(text[], int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_new_words(text[], int) TO authenticated;
REVOKE ALL ON FUNCTION public.level_themes(text[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.level_themes(text[], date) TO authenticated;

COMMIT;
