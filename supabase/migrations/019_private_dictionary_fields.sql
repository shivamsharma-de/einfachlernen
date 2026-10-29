-- 019_private_dictionary_fields.sql
--
-- A personal word has the same fields as a master word (de_words): German, article, part of
-- speech, English meaning, example sentences, synonyms. Synonyms are new on user_words and are
-- exposed through deck_words, so study and the personal list read one shape. The AI writes
-- every field; the learner can correct any of them later.
--
-- import_scan_words stores the synonyms the learner kept (at most five, each at most 40 chars).

BEGIN;

ALTER TABLE public.user_words
  ADD COLUMN IF NOT EXISTS synonyms text[] NOT NULL DEFAULT '{}';

-- deck_words gains synonyms as its last column, so existing readers are unaffected.
CREATE OR REPLACE VIEW public.deck_words WITH (security_invoker = true) AS
  SELECT id, german, article, word_type, english, level, level_source, level_confidence,
         forms, example_de, example_en, frequency_rank, thema, 'catalogue'::text AS origin,
         synonyms
    FROM public.de_words
   WHERE review_status = 'reviewed'
  UNION ALL
  SELECT id, german, article, word_type, english, level, 'estimated'::text, NULL::real,
         forms, example_de, example_en, NULL::integer, NULL::text, 'scan'::text,
         synonyms
    FROM public.user_words
   WHERE user_id = auth.uid();

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

COMMIT;
