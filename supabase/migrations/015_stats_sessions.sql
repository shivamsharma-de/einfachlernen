-- 015_stats_sessions.sql
--
-- Every stat a learner earns is written to the database under their user id, so
-- a reinstall restores it. The phone keeps no stat of its own.
--
--   study_sessions   one row per study session (review or test), client-generated id
--   review_log       gains local_day, xp and session_id
--   daily_activity   gains seconds, tests_taken, tests_correct
--   profiles         gains ui_lang
--
-- record_review now updates the session, the day and profiles.xp in the same
-- transaction as the review itself. A retried event is detected by its id and
-- changes nothing, so cards and XP can never be counted twice.
--
-- touch_session records time on task as a cumulative, monotonic total. Only the
-- increase is added to the day, so a late or repeated update is harmless.
--
-- Streaks use the device's local calendar date passed in, not the server's UTC date.
--
-- Idempotent where possible; record_review and current_streak are replaced.

BEGIN;

-- ── profiles: interface language ─────────────────────────────────────────────
-- NULL means "never chosen": the device's language is used and written here on first
-- sign-in. A default of 'de' would silently switch an English-speaking device to German.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_lang text;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_ui_lang_chk CHECK (ui_lang IS NULL OR ui_lang IN ('de', 'en'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── review_log: day, XP and session attribution ──────────────────────────────
ALTER TABLE public.review_log
  ADD COLUMN IF NOT EXISTS local_day  date,
  ADD COLUMN IF NOT EXISTS xp         integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  ADD COLUMN IF NOT EXISTS session_id uuid;

-- ── daily_activity: time, tests ──────────────────────────────────────────────
ALTER TABLE public.daily_activity
  ADD COLUMN IF NOT EXISTS seconds       integer NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  ADD COLUMN IF NOT EXISTS tests_taken   integer NOT NULL DEFAULT 0 CHECK (tests_taken >= 0),
  ADD COLUMN IF NOT EXISTS tests_correct integer NOT NULL DEFAULT 0 CHECK (tests_correct >= 0);

-- ── study_sessions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id              uuid        PRIMARY KEY,                 -- generated on the device
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind            text        NOT NULL DEFAULT 'review' CHECK (kind IN ('review', 'test')),
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  local_day       date        NOT NULL,
  active_seconds  integer     NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  cards_reviewed  integer     NOT NULL DEFAULT 0 CHECK (cards_reviewed >= 0),
  xp              integer     NOT NULL DEFAULT 0 CHECK (xp >= 0),
  levels          text[]      NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS study_sessions_user_time_idx
  ON public.study_sessions (user_id, started_at DESC);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS study_sessions_select_own ON public.study_sessions;
CREATE POLICY study_sessions_select_own ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Owners may insert and update their own sessions, so the RPCs below can write them
-- under SECURITY INVOKER like every other learner table. No client code writes here
-- directly; the RPCs are the only writers. Delete is not granted to clients.
DROP POLICY IF EXISTS study_sessions_insert_own ON public.study_sessions;
CREATE POLICY study_sessions_insert_own ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS study_sessions_update_own ON public.study_sessions;
CREATE POLICY study_sessions_update_own ON public.study_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── record_review (replaces the 12-argument version from migration 009) ──────
DROP FUNCTION IF EXISTS public.record_review(uuid, text, smallint, text, text, timestamptz,
  integer, integer, numeric, integer, date, boolean);

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
  p_mastered       boolean,
  p_session_id     uuid,
  p_local_day      date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inserted boolean;
  v_xp integer := CASE WHEN p_grade = 0 THEN 2 ELSE 10 END;   -- same as lib/srs.ts xpForGrade
  v_day date := COALESCE(p_local_day, current_date);
  v_at timestamptz := COALESCE(p_reviewed_at, now());
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- 1. Immutable history. A replayed event id stops here and counts nothing.
  INSERT INTO public.review_log
    (id, user_id, word_id, grade, level, origin, interval_days, reviewed_at, local_day, xp, session_id)
  VALUES
    (p_event_id, uid, p_word_id, p_grade, p_level, COALESCE(p_origin, 'catalogue'),
     COALESCE(p_interval_days, 0), v_at, v_day, v_xp, p_session_id)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF NOT inserted THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'duplicate');
  END IF;

  -- 2. The study session this card belongs to.
  IF p_session_id IS NOT NULL THEN
    INSERT INTO public.study_sessions (id, user_id, kind, local_day, cards_reviewed, xp)
    VALUES (p_session_id, uid, 'review', v_day, 1, v_xp)
    ON CONFLICT (id) DO UPDATE
      SET cards_reviewed = public.study_sessions.cards_reviewed + 1,
          xp             = public.study_sessions.xp + v_xp,
          last_active_at = now()
      WHERE public.study_sessions.user_id = uid;
  END IF;

  -- 3. The day's totals, and the learner's lifetime XP.
  INSERT INTO public.daily_activity (user_id, day, cards_reviewed, xp_earned)
  VALUES (uid, v_day, 1, v_xp)
  ON CONFLICT (user_id, day) DO UPDATE
    SET cards_reviewed = public.daily_activity.cards_reviewed + 1,
        xp_earned      = public.daily_activity.xp_earned + v_xp,
        updated_at     = now();

  UPDATE public.profiles SET xp = xp + v_xp WHERE id = uid;

  -- 4. Current word state. Moves only forward in time (see migration 009).
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
    p_next_review, p_mastered, p_grade, v_at, now(), 'level'
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

  RETURN jsonb_build_object('recorded', true, 'xp', v_xp);
END;
$$;

-- ── touch_session: time on task, cumulative and monotonic ────────────────────
CREATE OR REPLACE FUNCTION public.touch_session(
  p_session_id     uuid,
  p_kind           text,
  p_active_seconds integer,
  p_local_day      date,
  p_levels         text[] DEFAULT '{}'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_old integer;
  v_new integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.study_sessions (id, user_id, kind, local_day, levels)
  VALUES (p_session_id, uid, COALESCE(p_kind, 'review'), COALESCE(p_local_day, current_date),
          COALESCE(p_levels, '{}'))
  ON CONFLICT (id) DO NOTHING;

  -- Lock this session's row so two updates cannot both add the same increase.
  SELECT active_seconds INTO v_old
    FROM public.study_sessions
   WHERE id = p_session_id AND user_id = uid
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = '42501';
  END IF;

  v_new := GREATEST(v_old, COALESCE(p_active_seconds, 0));

  UPDATE public.study_sessions
     SET active_seconds = v_new,
         last_active_at = now()
   WHERE id = p_session_id;

  IF v_new > v_old THEN
    INSERT INTO public.daily_activity (user_id, day, seconds)
    VALUES (uid, COALESCE(p_local_day, current_date), v_new - v_old)
    ON CONFLICT (user_id, day) DO UPDATE
      SET seconds    = public.daily_activity.seconds + (v_new - v_old),
          updated_at = now();
  END IF;

  RETURN v_new;
END;
$$;

-- ── streak: consecutive active days ending today or yesterday ────────────────
-- Active = any card, test, time or legacy minutes that day. Replaces the
-- no-argument current_streak() from migration 005, which used the server's UTC date.
DROP FUNCTION IF EXISTS public.current_streak();

CREATE OR REPLACE FUNCTION public.current_streak(p_today date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH days AS (
    SELECT day, ROW_NUMBER() OVER (ORDER BY day DESC) AS rn
      FROM public.daily_activity
     WHERE user_id = auth.uid()
       AND day <= p_today
       AND (cards_reviewed > 0 OR tests_taken > 0 OR seconds > 0 OR minutes > 0)
  ),
  runs AS (
    SELECT day, rn, (day + (rn || ' days')::interval)::date AS grp FROM days
  )
  SELECT COALESCE(
    (SELECT count(*)::integer FROM runs
      WHERE grp = (SELECT grp FROM runs WHERE rn = 1)
        AND (SELECT day FROM runs WHERE rn = 1) >= p_today - 1),
    0);
$$;

-- ── activity_summary: everything Heute needs, in one call ────────────────────
CREATE OR REPLACE FUNCTION public.activity_summary(p_today date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'today', (
      SELECT jsonb_build_object(
               'cards', COALESCE(SUM(cards_reviewed), 0),
               'seconds', COALESCE(SUM(seconds), 0),
               'minutes', COALESCE(SUM(minutes), 0),
               'xp', COALESCE(SUM(xp_earned), 0),
               'tests', COALESCE(SUM(tests_taken), 0),
               'tests_correct', COALESCE(SUM(tests_correct), 0))
        FROM public.daily_activity
       WHERE user_id = auth.uid() AND day = p_today),
    'streak', public.current_streak(p_today),
    'total_xp', (SELECT COALESCE(xp, 0) FROM public.profiles WHERE id = auth.uid()),
    'last_7_days', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'day', day, 'cards', cards_reviewed, 'seconds', seconds,
               'xp', xp_earned, 'tests', tests_taken) ORDER BY day), '[]'::jsonb)
        FROM public.daily_activity
       WHERE user_id = auth.uid() AND day > p_today - 7 AND day <= p_today)
  );
$$;

-- ── grants ───────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.record_review(uuid, text, smallint, text, text, timestamptz,
  integer, integer, numeric, integer, date, boolean, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_review(uuid, text, smallint, text, text, timestamptz,
  integer, integer, numeric, integer, date, boolean, uuid, date) TO authenticated;

REVOKE ALL ON FUNCTION public.touch_session(uuid, text, integer, date, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_session(uuid, text, integer, date, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.current_streak(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_streak(date) TO authenticated;

REVOKE ALL ON FUNCTION public.activity_summary(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activity_summary(date) TO authenticated;

COMMIT;
