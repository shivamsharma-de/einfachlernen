-- 011_progress_reads.sql
--
-- Read functions for the Heute, Fortschritt and Meine Wörter screens.
--
-- Why functions and not client-side queries: PostgREST caps each response at
-- 1,000 rows, and the catalogue has ~3,000 served rows. A client that counts by
-- fetching rows silently under-reports. These return aggregates, so the number
-- is correct regardless of size.
--
-- Every function takes `p_today` from the device. The server's current_date is
-- UTC, which is wrong for the first hours of a German day, so the device's
-- calendar date decides what counts as "due".
--
-- All are SECURITY INVOKER: RLS on word_progress and the deck_words view already
-- limits results to the caller. Counts use deck_words, so drafts a learner is
-- never served are excluded.
--
-- Idempotent: CREATE OR REPLACE.

BEGIN;

-- Per-level totals of cards the deck can serve, and how many are estimated.
-- Public on purpose: it describes the catalogue, not a learner, and the level
-- picker needs it before sign-in is complete.
CREATE OR REPLACE FUNCTION public.level_counts()
RETURNS TABLE (level text, total bigint, estimated bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT d.level,
         count(*)                                              AS total,
         count(*) FILTER (WHERE d.level_source = 'estimated')  AS estimated
    FROM public.deck_words d
   GROUP BY d.level;
$$;

-- Per-level progress for the signed-in learner.
--   total       cards served at this level
--   introduced  cards the learner has any progress on
--   due         introduced, not mastered, and due on or before p_today
--   mastered    graduated cards
CREATE OR REPLACE FUNCTION public.level_progress(p_today date)
RETURNS TABLE (level text, total bigint, introduced bigint, due bigint, mastered bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH served AS (
    SELECT d.id, d.level FROM public.deck_words d
  ),
  mine AS (
    SELECT wp.word_id, wp.next_review_at, wp.mastered
      FROM public.word_progress wp
     WHERE wp.user_id = auth.uid()
  )
  SELECT s.level,
         count(*)                                                       AS total,
         count(m.word_id)                                               AS introduced,
         count(*) FILTER (WHERE m.word_id IS NOT NULL
                            AND NOT m.mastered
                            AND m.next_review_at <= p_today)            AS due,
         count(*) FILTER (WHERE m.mastered)                             AS mastered
    FROM served s
    LEFT JOIN mine m ON m.word_id = s.id
   GROUP BY s.level
   ORDER BY s.level;
$$;

-- The next day anything becomes due, after p_today. NULL when nothing is
-- scheduled, which the empty state reads as "all done for now".
CREATE OR REPLACE FUNCTION public.next_due_at(p_today date)
RETURNS date
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT min(wp.next_review_at)
    FROM public.word_progress wp
   WHERE wp.user_id = auth.uid()
     AND NOT wp.mastered
     AND wp.next_review_at > p_today;
$$;

-- Grants: the level counts are catalogue facts; the rest are learner data.
REVOKE ALL ON FUNCTION public.level_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.level_counts() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.level_progress(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.level_progress(date) TO authenticated;

REVOKE ALL ON FUNCTION public.next_due_at(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_due_at(date) TO authenticated;

COMMIT;
