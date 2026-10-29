-- 020_personal_new_cards.sql
--
-- Personal words (user_words) become NEW cards in the learner's deck, mixed with the
-- central new cards. Three changes:
--
--   * profiles.daily_personal_cards: how many personal words a learner may start per day.
--     It is a separate allowance, so a large scan cannot use up the central new-card limit.
--   * next_personal_words(): the personal words not yet started, in the learner's levels,
--     capped by what is left of today's allowance.
--   * import_scan_words() no longer writes a progress row for personal words. The first grade
--     creates it (record_review), which is what makes them new cards. Catalogue words picked
--     in a scan still get progress, as before.
--
-- "Started today" is derived from review_log (first grade of a personal word on that local
-- day), so no counter is stored.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_personal_cards integer NOT NULL DEFAULT 5;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_daily_personal_cards_chk
    CHECK (daily_personal_cards BETWEEN 0 AND 50);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Personal words whose first grade happened on p_today.
CREATE OR REPLACE FUNCTION public.personal_introduced_today(p_today date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::integer
    FROM (
      SELECT word_id, min(local_day) AS first_day
        FROM public.review_log
       WHERE user_id = auth.uid() AND left(word_id, 2) = 'u_'
       GROUP BY word_id
    ) firsts
   WHERE first_day = p_today;
$$;

-- Personal words the learner has not started, in the given levels, newest first.
-- At most (p_cap - started today) rows.
CREATE OR REPLACE FUNCTION public.next_personal_words(
  p_levels text[],
  p_cap    integer,
  p_today  date DEFAULT NULL
)
RETURNS TABLE (
  id          text,
  german      text,
  article     text,
  word_type   text,
  english     text,
  level       text,
  forms       jsonb,
  example_de  text,
  example_en  text,
  synonyms    text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.id, u.german, u.article, u.word_type, u.english, u.level, u.forms,
         u.example_de, u.example_en, u.synonyms
    FROM public.user_words u
   WHERE u.user_id = auth.uid()
     AND u.level = ANY (p_levels)
     AND NOT EXISTS (
       SELECT 1 FROM public.word_progress wp
        WHERE wp.user_id = u.user_id AND wp.word_id = u.id
     )
   ORDER BY u.created_at DESC
   LIMIT GREATEST(0, p_cap - public.personal_introduced_today(COALESCE(p_today, current_date)));
$$;

CREATE OR REPLACE FUNCTION public.import_scan_words(
  p_scan_id       uuid,
  p_catalogue_ids text[],
  p_words         jsonb,
  p_local_day     date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid    uuid := auth.uid();
  w      jsonb;
  v_id   text;
  v_cat  text[] := '{}';
  v_ids  text[] := '{}';
  v_new  integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Catalogue words the learner picked: reviewed entries only.
  SELECT COALESCE(array_agg(d.id), '{}') INTO v_cat
    FROM public.deck_words d
   WHERE d.origin = 'catalogue' AND d.id = ANY (COALESCE(p_catalogue_ids, '{}'));

  -- Personal words: saved to the personal dictionary, no progress yet (they become new cards).
  FOR w IN SELECT * FROM jsonb_array_elements(COALESCE(p_words, '[]'::jsonb)) LOOP
    INSERT INTO public.user_words (
      user_id, german, article, word_type, english, level, forms,
      example_de, example_en, synonyms, source_scan_id, meaning_source, uncertain
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
      COALESCE((
        SELECT array_agg(left(s, 40))
          FROM (SELECT jsonb_array_elements_text(COALESCE(w->'synonyms', '[]'::jsonb)) AS s LIMIT 5) t
      ), '{}'),
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

  -- Catalogue words start with a progress row, due today, as before.
  INSERT INTO public.word_progress (user_id, word_id, language, next_review_at, added_via)
  SELECT uid, x, 'de', COALESCE(p_local_day, current_date), 'scan'
    FROM unnest(v_cat) AS x
  ON CONFLICT (user_id, word_id) DO NOTHING;
  GET DIAGNOSTICS v_new = ROW_COUNT;

  v_ids := v_cat || v_ids;

  IF p_scan_id IS NOT NULL THEN
    UPDATE public.scan_results
       SET imported_count = GREATEST(imported_count, cardinality(v_ids))
     WHERE id = p_scan_id AND user_id = uid;
  END IF;

  RETURN jsonb_build_object('imported', v_new, 'word_ids', to_jsonb(v_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.personal_introduced_today(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.personal_introduced_today(date) TO authenticated;
REVOKE ALL ON FUNCTION public.next_personal_words(text[], integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_personal_words(text[], integer, date) TO authenticated;

COMMIT;
