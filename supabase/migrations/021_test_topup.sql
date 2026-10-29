-- 021_test_topup.sql
--
-- A round can be bigger than the words a learner has studied. start_test now fills the rest of
-- the round with other catalogue words at the learner's levels, so a 20-question round gives 20
-- questions. The response includes `studied`, so the app can say how many of the questions come
-- from words the learner has already studied. Otherwise start_test is unchanged from 018.

BEGIN;

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
  v_topup boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_studied
    FROM public.word_progress wp JOIN public.deck_words d ON d.id = wp.word_id AND d.origin = 'catalogue'
   WHERE wp.user_id = uid AND d.level = ANY (p_levels);

  -- Fewer than five studied words: test the first look at the selected levels.
  IF v_studied < 5 THEN v_mode := 'first_look'; END IF;
  -- Not enough studied words for the round: fill it with other words at the learner's levels.
  v_topup := v_studied < p_count;

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
         AND d.origin = 'catalogue'
         AND d.word_type IN ('noun', 'verb', 'adjective', 'adverb')
         AND (v_mode = 'first_look' OR v_topup OR wp.word_id IS NOT NULL)
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
    'questions', v_questions, 'studied', v_studied);
END;
$$;

COMMIT;
