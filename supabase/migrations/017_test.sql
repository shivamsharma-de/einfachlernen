-- 017_test.sql
--
-- The vocabulary test: attempts, per-word results and the traffic light.
--
-- Questions are frozen when a test starts. Each item stores the exact option texts,
-- the word each option came from, and the correct index, so an answer is always scored
-- against what the learner actually saw, even if the dictionary changes later.
--
-- A test answer never changes the flashcard schedule (word_progress). It feeds
-- word_test_stats (the traffic light), daily_activity and profiles.xp only.
--
-- Traffic light, from a word's last two test answers (Fahrschulcard "Fragenstatus"):
--   grey    never tested
--   red     any wrong answer among the last two
--   yellow  exactly one attempt so far, and it was correct
--   green   the last two answers were both correct
--
-- XP: +5 per correct answer, capped at 100 test XP per day; +10 for a perfect round.
-- Idempotent.

BEGIN;

-- ── tables ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode          text        NOT NULL DEFAULT 'studied' CHECK (mode IN ('studied', 'first_look')),
  levels        text[]      NOT NULL DEFAULT '{}',
  local_day     date        NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  total         integer     NOT NULL DEFAULT 0,
  correct       integer     NOT NULL DEFAULT 0,
  perfect_bonus boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS test_attempts_user_time_idx
  ON public.test_attempts (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.attempt_items (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid    NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  user_id         uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position        integer NOT NULL CHECK (position >= 1),
  word_id         text    NOT NULL REFERENCES public.de_words(id) ON DELETE CASCADE,
  options         text[]  NOT NULL,          -- frozen option texts, in displayed order
  option_word_ids text[]  NOT NULL,          -- the dictionary word each option came from
  correct_index   integer NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  chosen_index    integer CHECK (chosen_index IS NULL OR chosen_index BETWEEN 0 AND 3),
  correct         boolean,
  answered_at     timestamptz,
  UNIQUE (attempt_id, position)
);

CREATE TABLE IF NOT EXISTS public.word_test_stats (
  user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id   text        NOT NULL REFERENCES public.de_words(id) ON DELETE CASCADE,
  attempts  integer     NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  correct   integer     NOT NULL DEFAULT 0 CHECK (correct >= 0),
  wrong     integer     NOT NULL DEFAULT 0 CHECK (wrong >= 0),
  last_two  boolean[]   NOT NULL DEFAULT '{}',   -- true = correct, most recent last
  last_at   timestamptz,
  PRIMARY KEY (user_id, word_id)
);

-- ── row level security: owners only, no deletes from clients ────────────────
ALTER TABLE public.test_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_test_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_attempts_own ON public.test_attempts;
CREATE POLICY test_attempts_own ON public.test_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS attempt_items_own ON public.attempt_items;
CREATE POLICY attempt_items_own ON public.attempt_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS word_test_stats_own ON public.word_test_stats;
CREATE POLICY word_test_stats_own ON public.word_test_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── light, from the last two answers ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.test_light(p_attempts integer, p_last_two boolean[])
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_attempts, 0) = 0 THEN 'grey'
    WHEN false = ANY (COALESCE(p_last_two, '{}')) THEN 'red'
    WHEN cardinality(p_last_two) = 1 THEN 'yellow'
    ELSE 'green'
  END;
$$;

-- Every studied word with its light, for the Heute bar and Meine Wörter.
CREATE OR REPLACE FUNCTION public.word_lights(p_levels text[])
RETURNS TABLE (word_id text, light text, attempts integer, correct integer, wrong integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT wp.word_id,
         public.test_light(COALESCE(s.attempts, 0), COALESCE(s.last_two, '{}')),
         COALESCE(s.attempts, 0), COALESCE(s.correct, 0), COALESCE(s.wrong, 0)
    FROM public.word_progress wp
    JOIN public.deck_words d ON d.id = wp.word_id
    LEFT JOIN public.word_test_stats s ON s.word_id = wp.word_id AND s.user_id = wp.user_id
   WHERE wp.user_id = auth.uid()
     AND d.level = ANY (p_levels);
$$;

-- ── start_test ───────────────────────────────────────────────────────────────
-- Picks studied words weighted toward need (red and never-tested first), builds four
-- options for each from approved, still-served distractors, and freezes the lot.
CREATE OR REPLACE FUNCTION public.start_test(
  p_levels    text[],
  p_count     integer DEFAULT 10,
  p_local_day date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_mode text := 'studied';
  v_attempt uuid;
  v_pos integer := 0;
  v_word record;
  v_dist record;
  v_opts text[];
  v_ids text[];
  v_correct text;
  v_perm integer[];
  v_correct_index integer;
  v_item_id uuid;
  v_questions jsonb := '[]'::jsonb;
  v_studied integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_studied
    FROM public.word_progress wp JOIN public.deck_words d ON d.id = wp.word_id
   WHERE wp.user_id = uid AND d.level = ANY (p_levels);

  -- Fewer than five studied words: test the first look at the selected levels.
  IF v_studied < 5 THEN v_mode := 'first_look'; END IF;

  INSERT INTO public.test_attempts (user_id, mode, levels, local_day)
  VALUES (uid, v_mode, COALESCE(p_levels, '{}'), COALESCE(p_local_day, current_date))
  RETURNING id INTO v_attempt;

  FOR v_word IN
    WITH pool AS (
      SELECT d.id, d.german, d.article, d.word_type, d.level, d.english,
             CASE
               WHEN v_mode = 'first_look' THEN 1
               ELSE COALESCE(
                      CASE public.test_light(COALESCE(s.attempts,0), COALESCE(s.last_two,'{}'))
                        WHEN 'red' THEN 4 WHEN 'grey' THEN 3 WHEN 'yellow' THEN 2 ELSE 1 END, 3)
             END AS weight
        FROM public.deck_words d
        LEFT JOIN public.word_progress wp ON wp.word_id = d.id AND wp.user_id = uid
        LEFT JOIN public.word_test_stats s ON s.word_id = d.id AND s.user_id = uid
       WHERE d.level = ANY (p_levels)
         AND d.word_type IN ('noun', 'verb', 'adjective', 'adverb')
         AND (v_mode = 'first_look' OR wp.word_id IS NOT NULL)
    )
    SELECT * FROM pool
     ORDER BY ln(random()) / weight DESC      -- weighted sampling without replacement
  LOOP
    EXIT WHEN v_pos >= p_count;

    -- Three approved, still-served distractors whose glosses are distinct from the answer and each other.
    v_opts := ARRAY[public.gloss_short(v_word.english)];
    v_ids  := ARRAY[v_word.id];
    FOR v_dist IN
      SELECT dw.id, dw.english
        FROM public.word_distractors wd
        JOIN public.deck_words dw ON dw.id = wd.distractor_word_id
       WHERE wd.word_id = v_word.id AND wd.approved
       ORDER BY random()
    LOOP
      EXIT WHEN cardinality(v_opts) >= 4;
      IF public.gloss_short(v_dist.english) = '' THEN CONTINUE; END IF;
      IF public.gloss_short(v_dist.english) = ANY (v_opts) THEN CONTINUE; END IF;
      v_opts := v_opts || public.gloss_short(v_dist.english);
      v_ids  := v_ids  || v_dist.id;
    END LOOP;

    CONTINUE WHEN cardinality(v_opts) < 4;     -- skip a word without enough good distractors

    -- Shuffle the four options, and remember where the correct one landed.
    v_correct := v_opts[1];
    SELECT array_agg(v_opts[i] ORDER BY rnd), array_agg(v_ids[i] ORDER BY rnd)
      INTO v_opts, v_ids
      FROM (SELECT i, random() AS rnd FROM generate_series(1, 4) AS i) p;
    SELECT i - 1 INTO v_correct_index FROM generate_subscripts(v_opts, 1) AS i
     WHERE v_opts[i] = public.gloss_short(v_word.english);

    v_pos := v_pos + 1;
    INSERT INTO public.attempt_items
      (attempt_id, user_id, position, word_id, options, option_word_ids, correct_index)
    VALUES (v_attempt, uid, v_pos, v_word.id, v_opts, v_ids, v_correct_index)
    RETURNING id INTO v_item_id;

    v_questions := v_questions || jsonb_build_object(
      'item_id', v_item_id,
      'position', v_pos,
      'word_id', v_word.id,
      'german', v_word.german,
      'article', v_word.article,
      'word_type', v_word.word_type,
      'level', v_word.level,
      'options', to_jsonb(v_opts),
      'correct_index', v_correct_index);
  END LOOP;

  IF v_pos = 0 THEN
    DELETE FROM public.test_attempts WHERE id = v_attempt;
    RAISE EXCEPTION 'not_enough_material' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.test_attempts SET total = v_pos WHERE id = v_attempt;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt,
    'mode', v_mode,
    'total', v_pos,
    'questions', v_questions);
END;
$$;

-- ── submit_answer ────────────────────────────────────────────────────────────
-- Scores against the frozen snapshot. Idempotent: an item is answered once, and a
-- repeat returns the first result.
CREATE OR REPLACE FUNCTION public.submit_answer(
  p_item_id     uuid,
  p_chosen      integer,
  p_local_day   date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_item public.attempt_items%ROWTYPE;
  v_correct boolean;
  v_before_correct integer;
  v_xp integer := 0;
  v_last boolean[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item FROM public.attempt_items
   WHERE id = p_item_id AND user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found' USING ERRCODE = '42501'; END IF;

  IF v_item.answered_at IS NOT NULL THEN
    RETURN jsonb_build_object('already_answered', true, 'correct', v_item.correct,
                              'correct_index', v_item.correct_index);
  END IF;

  IF p_chosen IS NULL OR p_chosen NOT BETWEEN 0 AND 3 THEN
    RAISE EXCEPTION 'invalid_choice' USING ERRCODE = '22023';
  END IF;

  v_correct := (p_chosen = v_item.correct_index);

  UPDATE public.attempt_items
     SET chosen_index = p_chosen, correct = v_correct, answered_at = now()
   WHERE id = p_item_id;

  -- Per-word result and the traffic light's last two answers.
  INSERT INTO public.word_test_stats (user_id, word_id, attempts, correct, wrong, last_two, last_at)
  VALUES (uid, v_item.word_id, 0, 0, 0, '{}', now())
  ON CONFLICT (user_id, word_id) DO NOTHING;

  SELECT last_two INTO v_last FROM public.word_test_stats
   WHERE user_id = uid AND word_id = v_item.word_id FOR UPDATE;
  v_last := array_append(COALESCE(v_last, '{}'), v_correct);
  IF cardinality(v_last) > 2 THEN
    v_last := v_last[cardinality(v_last) - 1 : cardinality(v_last)];
  END IF;

  UPDATE public.word_test_stats
     SET attempts = attempts + 1,
         correct  = correct + CASE WHEN v_correct THEN 1 ELSE 0 END,
         wrong    = wrong   + CASE WHEN v_correct THEN 0 ELSE 1 END,
         last_two = v_last,
         last_at  = now()
   WHERE user_id = uid AND word_id = v_item.word_id;

  -- Day totals and XP, with the daily test-XP cap.
  SELECT COALESCE(tests_correct, 0) INTO v_before_correct
    FROM public.daily_activity WHERE user_id = uid AND day = p_local_day;
  v_before_correct := COALESCE(v_before_correct, 0);

  IF v_correct THEN
    v_xp := LEAST(5, GREATEST(0, 100 - 5 * v_before_correct));
  END IF;

  INSERT INTO public.daily_activity (user_id, day, tests_taken, tests_correct, xp_earned)
  VALUES (uid, p_local_day, 1, CASE WHEN v_correct THEN 1 ELSE 0 END, v_xp)
  ON CONFLICT (user_id, day) DO UPDATE
    SET tests_taken   = public.daily_activity.tests_taken + 1,
        tests_correct = public.daily_activity.tests_correct + CASE WHEN v_correct THEN 1 ELSE 0 END,
        xp_earned     = public.daily_activity.xp_earned + v_xp,
        updated_at    = now();

  IF v_xp > 0 THEN
    UPDATE public.profiles SET xp = xp + v_xp WHERE id = uid;
  END IF;

  RETURN jsonb_build_object('already_answered', false, 'correct', v_correct,
                            'correct_index', v_item.correct_index, 'xp', v_xp);
END;
$$;

-- ── finish_test ──────────────────────────────────────────────────────────────
-- Closes the attempt. A perfect round earns +10 once.
CREATE OR REPLACE FUNCTION public.finish_test(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_att public.test_attempts%ROWTYPE;
  v_total integer;
  v_correct integer;
  v_bonus integer := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_att FROM public.test_attempts
   WHERE id = p_attempt_id AND user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt_not_found' USING ERRCODE = '42501'; END IF;

  IF v_att.finished_at IS NOT NULL THEN
    RETURN jsonb_build_object('already_finished', true, 'correct', v_att.correct,
                              'total', v_att.total, 'perfect_bonus', v_att.perfect_bonus);
  END IF;

  SELECT count(*), count(*) FILTER (WHERE correct)
    INTO v_total, v_correct
    FROM public.attempt_items WHERE attempt_id = p_attempt_id AND answered_at IS NOT NULL;

  IF v_total = v_att.total AND v_correct = v_att.total AND v_att.total >= 10 THEN
    v_bonus := 10;
    UPDATE public.profiles SET xp = xp + v_bonus WHERE id = uid;
    INSERT INTO public.daily_activity (user_id, day, xp_earned)
    VALUES (uid, v_att.local_day, v_bonus)
    ON CONFLICT (user_id, day) DO UPDATE
      SET xp_earned = public.daily_activity.xp_earned + v_bonus, updated_at = now();
  END IF;

  UPDATE public.test_attempts
     SET finished_at = now(), correct = v_correct, total = v_att.total,
         perfect_bonus = (v_bonus > 0)
   WHERE id = p_attempt_id;

  RETURN jsonb_build_object('already_finished', false, 'correct', v_correct,
                            'total', v_att.total, 'perfect_bonus', v_bonus > 0);
END;
$$;

-- ── grants ───────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.test_light(integer, boolean[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_light(integer, boolean[]) TO authenticated;
REVOKE ALL ON FUNCTION public.word_lights(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.word_lights(text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.start_test(text[], integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_test(text[], integer, date) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_answer(uuid, integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, integer, date) TO authenticated;
REVOKE ALL ON FUNCTION public.finish_test(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_test(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.gloss_short(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gloss_short(text) TO anon, authenticated;

COMMIT;
