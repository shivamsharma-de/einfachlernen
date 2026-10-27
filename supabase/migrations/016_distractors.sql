-- 016_distractors.sql
--
-- Wrong answers for the vocabulary test, chosen once per word and reviewed, then
-- stored as references to other dictionary entries. Nothing is copied: if a meaning
-- in de_words is corrected, every test built from it uses the corrected text.
--
--   word_distractors   (word_id, distractor_word_id) pairs, approved or rejected
--   gloss_short()      the one place the "short English meaning" rule lives; the
--                      distractor job and the test both call it
--
-- Written by the content pipeline (stage 09) and by manual fixes, never by clients.
-- Idempotent.

BEGIN;

CREATE OR REPLACE FUNCTION public.gloss_short(p_english text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT left(
           btrim(
             regexp_replace(
               split_part(split_part(COALESCE(p_english, ''), ';', 1), ',', 1),
               '\([^)]*\)', '', 'g')),
           32);
$$;

CREATE TABLE IF NOT EXISTS public.word_distractors (
  word_id             text        NOT NULL REFERENCES public.de_words(id) ON DELETE CASCADE,
  distractor_word_id  text        NOT NULL REFERENCES public.de_words(id) ON DELETE CASCADE,
  approved            boolean     NOT NULL DEFAULT false,
  source              text        NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (word_id, distractor_word_id),
  CONSTRAINT word_distractors_not_self CHECK (word_id <> distractor_word_id)
);

CREATE INDEX IF NOT EXISTS word_distractors_approved_idx
  ON public.word_distractors (word_id) WHERE approved;

ALTER TABLE public.word_distractors ENABLE ROW LEVEL SECURITY;

-- Catalogue data, readable by any signed-in learner. No client write policies.
DROP POLICY IF EXISTS word_distractors_read ON public.word_distractors;
CREATE POLICY word_distractors_read ON public.word_distractors
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.word_distractors FROM anon;

COMMIT;
