-- 025_next_new_words_synonyms.sql
--
-- Migration 019 added `synonyms` to the deck_words view. next_new_words returns SETOF deck_words
-- and lists its columns by hand, so it stopped working: "final statement returns too few columns".
-- The app treats that error as "no new cards", so learners saw an empty deck. This restores the
-- function with the synonyms column included. Its ordering and filters are unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.next_new_words(p_levels text[], p_limit integer)
RETURNS SETOF public.deck_words
LANGUAGE sql
STABLE
SET search_path = public
AS $$
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
         c.thema, c.origin, c.synonyms
    FROM candidates c
   ORDER BY c.level_rank, c.frequency_rank NULLS LAST, c.id
   LIMIT p_limit;
$$;

COMMIT;
