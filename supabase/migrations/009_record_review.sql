-- 009_record_review.sql
--
-- One call records a grade: the immutable history row AND the current word state.
--
-- Two properties matter for an app that is used on trains:
--
--   1. Idempotent. The client generates p_event_id once per grade and reuses it
--      on every retry. A repeat is detected and changes nothing, so a flaky
--      connection can never double-count a review.
--
--   2. Newest-wins. A delayed retry of an OLD grade must not overwrite the state
--      produced by a NEWER one. word_progress only moves forward in time: the
--      state is replaced only when p_reviewed_at is at least as new as the stored
--      last_reviewed_at.
--
-- The SM-2 arithmetic stays on the client (lib/srs.ts `schedule()`), so this
-- function stores the state the client computed rather than re-deriving it.
-- SECURITY INVOKER: RLS on review_log and word_progress already restricts every
-- row to auth.uid(), so the function cannot write for another user.
--
-- Idempotent: CREATE OR REPLACE.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_review(
  p_event_id       uuid,
  p_word_id        text,
  p_grade          smallint,
  p_level          text,
  p_origin         text,
  p_reviewed_at    timestamptz,
  p_repetitions    integer,
  p_interval_days  integer,
  p_ease_factor    numeric,
  p_lapses         integer,
  p_next_review    date,
  p_mastered       boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  inserted boolean;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- 1. Immutable history. A replayed event id is a no-op.
  INSERT INTO public.review_log (id, user_id, word_id, grade, level, origin, interval_days, reviewed_at)
  VALUES (p_event_id, uid, p_word_id, p_grade, p_level, COALESCE(p_origin, 'catalogue'),
          COALESCE(p_interval_days, 0), COALESCE(p_reviewed_at, now()))
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF NOT inserted THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'duplicate');
  END IF;

  -- 2. Current state. Only ever moves forward in time (see header, point 2).
  INSERT INTO public.word_progress AS wp (
    user_id, word_id, language,
    correct_count, incorrect_count,
    repetitions, interval_days, ease_factor, lapses,
    next_review_at, mastered, last_grade, last_reviewed_at, updated_at, added_via
  )
  VALUES (
    uid, p_word_id, 'de',
    CASE WHEN p_grade >= 2 THEN 1 ELSE 0 END,
    CASE WHEN p_grade < 2  THEN 1 ELSE 0 END,
    p_repetitions, p_interval_days, p_ease_factor, p_lapses,
    p_next_review, p_mastered, p_grade,
    COALESCE(p_reviewed_at, now()), now(), 'level'
  )
  ON CONFLICT (user_id, word_id) DO UPDATE
    SET correct_count     = wp.correct_count   + EXCLUDED.correct_count,
        incorrect_count   = wp.incorrect_count + EXCLUDED.incorrect_count,
        repetitions       = EXCLUDED.repetitions,
        interval_days     = EXCLUDED.interval_days,
        ease_factor       = EXCLUDED.ease_factor,
        lapses            = EXCLUDED.lapses,
        next_review_at    = EXCLUDED.next_review_at,
        mastered          = EXCLUDED.mastered,
        last_grade        = EXCLUDED.last_grade,
        last_reviewed_at  = EXCLUDED.last_reviewed_at,
        updated_at        = now()
    WHERE wp.last_reviewed_at IS NULL
       OR EXCLUDED.last_reviewed_at >= wp.last_reviewed_at;

  RETURN jsonb_build_object('recorded', true);
END;
$$;

REVOKE ALL ON FUNCTION public.record_review(uuid, text, smallint, text, text, timestamptz,
  integer, integer, numeric, integer, date, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_review(uuid, text, smallint, text, text, timestamptz,
  integer, integer, numeric, integer, date, boolean) TO authenticated;

COMMIT;
