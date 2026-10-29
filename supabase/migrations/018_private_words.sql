-- 018_private_words.sql
--
-- A learner's private words (scan imports and AI-written meanings, user_words) live in
-- their own dictionary. This migration:
--   * adds provenance to user_words (who wrote the meaning, uncertain flag, updated_at)
--   * import_scan_words(): saves chosen words, adds them to the deck, idempotent
--   * delete_user_word(): removes a private word and its progress
--   * re-creates word_lights and start_test so private words never enter a test.
--     The test needs vetted distractors and its tables reference de_words ids
--     (attempt_items, word_test_stats). Private words are flashcards only.
--
-- Private words stay visible in the deck (deck_words, origin = 'scan').
-- user_words is owner-only under RLS (006), so nothing here changes who can read it.

BEGIN;

ALTER TABLE public.user_words
  ADD COLUMN IF NOT EXISTS meaning_source text NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS uncertain      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.user_words ADD CONSTRAINT user_words_meaning_source_chk
    CHECK (meaning_source IN ('ai', 'user'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.user_words ADD CONSTRAINT user_words_word_type_chk
    CHECK (word_type IN ('noun', 'verb', 'adjective', 'adverb', 'phrase', 'conjunction',
                         'preposition', 'pronoun', 'number', 'interjection'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.user_words ADD CONSTRAINT user_words_english_len_chk
    CHECK (char_length(english) BETWEEN 1 AND 200);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── import_scan_words ────────────────────────────────────────────────────────
-- p_catalogue_ids: dictionary words the learner picked (must be reviewed, origin = catalogue).
-- p_words: AI-written entries the learner picked, as a JSON array of
--   { german, article, word_type, english, level, forms, example_de, example_en, uncertain }.
-- Re-running with the same words adds nothing: existing rows are kept, progress is never reset.
CREATE OR REPLACE FUNCTION public.import_scan_words(
  p_scan_id     uuid,
  p_catalogue_ids text[],
  p_words       jsonb,
  p_local_day   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid   uuid := auth.uid();
  w     jsonb;
  v_id  text;
  v_ids text[] := '{}';
  v_new integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(d.id), '{}') INTO v_ids
    FROM public.deck_words d
   WHERE d.origin = 'catalogue' AND d.id = ANY (COALESCE(p_catalogue_ids, '{}'));

  FOR w IN SELECT * FROM jsonb_array_elements(COALESCE(p_words, '[]'::jsonb)) LOOP
    INSERT INTO public.user_words (
      user_id, german, article, word_type, english, level, forms,
      example_de, example_en, source_scan_id, meaning_source, uncertain
    ) VALUES (
      uid,
      left(w->>'german', 80),
      nullif(w->>'article', ''),
      w->>'word_type',
      left(w->>'english', 200),
      w->>'level',
      COALESCE(w->'forms', '{}'::jsonb),
      left(w->>'example_de', 300),
      left(w->>'example_en', 300),
      p_scan_id,
      'ai',
      COALESCE((w->>'uncertain')::boolean, false)
    )
    ON CONFLICT (user_id, lemma_key) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.user_words
       WHERE user_id = uid AND lemma_key = lower(w->>'german');
    END IF;
    IF v_id IS NOT NULL THEN
      v_ids := array_append(v_ids, v_id);
    END IF;
  END LOOP;

  INSERT INTO public.word_progress (user_id, word_id, language, next_review_at, added_via)
  SELECT uid, x, 'de', COALESCE(p_local_day, current_date), 'scan'
    FROM unnest(v_ids) AS x
  ON CONFLICT (user_id, word_id) DO NOTHING;
  GET DIAGNOSTICS v_new = ROW_COUNT;

  IF p_scan_id IS NOT NULL THEN
    UPDATE public.scan_results
       SET imported_count = GREATEST(imported_count, cardinality(v_ids))
     WHERE id = p_scan_id AND user_id = uid;
  END IF;

  RETURN jsonb_build_object('imported', v_new, 'word_ids', to_jsonb(v_ids));
END;
$$;

-- ── delete_user_word ─────────────────────────────────────────────────────────
-- Removes one private word from the learner's dictionary and its progress. Review history
-- (review_log) is append-only and stays. Catalogue words cannot be deleted through this.
CREATE OR REPLACE FUNCTION public.delete_user_word(p_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF left(p_id, 2) <> 'u_' THEN
    RETURN false;
  END IF;

  DELETE FROM public.word_progress WHERE user_id = uid AND word_id = p_id;
  DELETE FROM public.user_words WHERE user_id = uid AND id = p_id;
  RETURN FOUND;
END;
$$;

-- ── word_lights and start_test, catalogue words only (copied from 017) ───────
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
    JOIN public.deck_words d ON d.id = wp.word_id AND d.origin = 'catalogue'
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
    FROM public.word_progress wp JOIN public.deck_words d ON d.id = wp.word_id AND d.origin = 'catalogue'
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
         AND d.origin = 'catalogue'
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

REVOKE ALL ON FUNCTION public.import_scan_words(uuid, text[], jsonb, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_scan_words(uuid, text[], jsonb, date) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_user_word(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_word(text) TO authenticated;
REVOKE ALL ON FUNCTION public.word_lights(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.word_lights(text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.start_test(text[], integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_test(text[], integer, date) TO authenticated;

COMMIT;
