-- 007_new_words_skip_function_words.sql
--
-- The frequency-ranked catalogue puts function words at the very top, so an A1
-- learner's first five cards came out as: ich, die, ein, in, und. Each is a
-- legitimate dictionary entry and none is a useful flashcard — you do not learn
-- "and" by reviewing it, and an article on its own teaches nothing, because
-- gender is a property of the noun it attaches to.
--
-- They stay in the catalogue: scan matching needs them so that photographing a
-- page does not report every "und" as an unknown word. They are simply never
-- introduced as new cards.
--
-- Idempotent: CREATE OR REPLACE.

BEGIN;

CREATE OR REPLACE FUNCTION public.next_new_words(p_level text, p_limit int)
RETURNS SETOF public.deck_words
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT d.*
    FROM public.deck_words d
   WHERE d.level = p_level
     AND d.word_type NOT IN ('pronoun', 'conjunction', 'preposition', 'number', 'interjection')
     AND NOT EXISTS (
           SELECT 1 FROM public.word_progress wp
            WHERE wp.word_id = d.id AND wp.user_id = auth.uid())
   ORDER BY d.frequency_rank NULLS LAST, d.id
   LIMIT p_limit;
$$;

COMMIT;
