-- 012_level_themes.sql
--
-- Per-theme summary for one level, for the Heute screen's Themen shelf and its
-- "continue" card. It replaces a client-side pass over every word at the level,
-- which hit PostgREST's 1,000-row cap at B2 (1,343 served words) and so showed
-- the wrong totals.
--
--   total    served words in the theme at this level
--   started  words the learner has any progress on
--   due      started, not mastered, and due on or before p_today
--
-- Uses the deck_words view, so drafts are excluded. A word with no theme is
-- grouped as 'Allgemein' rather than dropped, so totals reconcile with level_counts.
--
-- SECURITY INVOKER, so progress counts come from the caller's own word_progress
-- rows only. p_today comes from the device for the same reason as level_progress.
--
-- Idempotent: CREATE OR REPLACE.

BEGIN;

CREATE OR REPLACE FUNCTION public.level_themes(p_level text, p_today date)
RETURNS TABLE (thema text, total bigint, started bigint, due bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH served AS (
    SELECT COALESCE(d.thema, 'Allgemein') AS thema, d.id
      FROM public.deck_words d
     WHERE d.level = p_level
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

REVOKE ALL ON FUNCTION public.level_themes(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.level_themes(text, date) TO authenticated;

COMMIT;
