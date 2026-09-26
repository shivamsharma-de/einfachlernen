-- PRD v2 — profile/deck/activity/AI/themen
-- Idempotent, matching the convention of 001–004. Run AFTER 004.

-- ─── WORD_PROGRESS: extend SM-2 lite to four grades ─────────────────────────
-- 001 shipped repetitions/interval_days/next_review_at/mastered, which supports
-- a binary got-it/didn't. The deck design grades again/hard/good/easy, so the
-- scheduler needs an ease factor and lapse tracking.

ALTER TABLE public.word_progress
  ADD COLUMN IF NOT EXISTS ease_factor numeric(4,2) NOT NULL DEFAULT 2.50,
  ADD COLUMN IF NOT EXISTS last_grade  smallint,
  ADD COLUMN IF NOT EXISTS lapses      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

-- SM-2 floors the ease factor at 1.30; keep the DB honest about it.
ALTER TABLE public.word_progress DROP CONSTRAINT IF EXISTS word_progress_ease_floor;
ALTER TABLE public.word_progress
  ADD CONSTRAINT word_progress_ease_floor CHECK (ease_factor >= 1.30);

ALTER TABLE public.word_progress DROP CONSTRAINT IF EXISTS word_progress_grade_range;
ALTER TABLE public.word_progress
  ADD CONSTRAINT word_progress_grade_range
  CHECK (last_grade IS NULL OR last_grade BETWEEN 0 AND 3);

-- The deck's hot query is "my cards due today".
CREATE INDEX IF NOT EXISTS word_progress_due_idx
  ON public.word_progress (user_id, next_review_at);

-- ─── DAILY_ACTIVITY: daily usage tracking ───────────────────────────────────
-- One row per user per day. Streak is DERIVED from consecutive days rather than
-- stored, so a backfilled day or a wrong device clock cannot corrupt a counter.

CREATE TABLE IF NOT EXISTS public.daily_activity (
  user_id        uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day            date    NOT NULL DEFAULT current_date,
  minutes        integer NOT NULL DEFAULT 0,
  cards_reviewed integer NOT NULL DEFAULT 0,
  xp_earned      integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own activity" ON public.daily_activity;
CREATE POLICY "Users can manage own activity"
  ON public.daily_activity FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_activity_day_idx
  ON public.daily_activity (user_id, day DESC);

-- Accumulate a study session without a read-modify-write race between devices.
CREATE OR REPLACE FUNCTION public.log_activity(
  p_minutes integer DEFAULT 0,
  p_cards   integer DEFAULT 0,
  p_xp      integer DEFAULT 0
)
RETURNS public.daily_activity
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result public.daily_activity;
BEGIN
  INSERT INTO public.daily_activity AS da (user_id, day, minutes, cards_reviewed, xp_earned)
  VALUES (auth.uid(), current_date, GREATEST(p_minutes, 0), GREATEST(p_cards, 0), GREATEST(p_xp, 0))
  ON CONFLICT (user_id, day) DO UPDATE
    SET minutes        = da.minutes        + GREATEST(p_minutes, 0),
        cards_reviewed = da.cards_reviewed + GREATEST(p_cards, 0),
        xp_earned      = da.xp_earned      + GREATEST(p_xp, 0),
        updated_at     = now()
  RETURNING * INTO result;

  UPDATE public.profiles
     SET xp = xp + GREATEST(p_xp, 0),
         last_active_date = current_date
   WHERE id = auth.uid();

  RETURN result;
END;
$$;

-- Streak = length of the unbroken run of active days ending today or yesterday.
-- Yesterday still counts so the streak does not visibly reset before the user
-- has had a chance to study today.
CREATE OR REPLACE FUNCTION public.current_streak()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH days AS (
    SELECT day, ROW_NUMBER() OVER (ORDER BY day DESC) AS rn
      FROM public.daily_activity
     WHERE user_id = auth.uid() AND minutes > 0 AND day <= current_date
  ),
  runs AS (
    -- Consecutive dates share a constant (day + rn).
    SELECT day, rn, (day + (rn || ' days')::interval)::date AS grp FROM days
  )
  SELECT COALESCE(
    (SELECT count(*)::integer FROM runs
      WHERE grp = (SELECT grp FROM runs WHERE rn = 1)
        AND (SELECT day FROM runs WHERE rn = 1) >= current_date - 1),
    0);
$$;

-- ─── DE_WORD_AI: global AI enrichment cache ─────────────────────────────────
-- Not per user: a word's meaning is the same for everyone, so one generation
-- serves the whole user base.

CREATE TABLE IF NOT EXISTS public.de_word_ai (
  word_id      text PRIMARY KEY REFERENCES public.de_words(id) ON DELETE CASCADE,
  meaning      text NOT NULL,
  description  text,
  examples     jsonb NOT NULL DEFAULT '[]',
  grammar      jsonb NOT NULL DEFAULT '{}',
  model        text,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.de_word_ai ENABLE ROW LEVEL SECURITY;

-- Readable by any signed-in user; only the service role (the Edge Function)
-- writes, so the client cannot poison the cache.
DROP POLICY IF EXISTS "AI content is readable by authenticated users" ON public.de_word_ai;
CREATE POLICY "AI content is readable by authenticated users"
  ON public.de_word_ai FOR SELECT
  TO authenticated
  USING (true);

-- ─── DE_WORDS.THEMA: canonical exam themes ──────────────────────────────────
-- Free-text `category` is preserved; `thema` is the normalised grouping key.

ALTER TABLE public.de_words ADD COLUMN IF NOT EXISTS thema text;

UPDATE public.de_words SET thema = CASE
  WHEN category IN ('Work','Business','Office')                   THEN 'arbeit'
  WHEN category IN ('Housing','Home','Furniture')                 THEN 'wohnen'
  WHEN category IN ('Health','Body','Medical')                    THEN 'gesundheit'
  WHEN category IN ('Environment','Nature','Weather','Animals')   THEN 'umwelt'
  WHEN category IN ('Media','Technology','Digital')               THEN 'medien'
  WHEN category IN ('Education','School','Study')                 THEN 'bildung'
  WHEN category IN ('Travel','Transport','Directions','Holidays') THEN 'reisen'
  WHEN category IN ('Festivals','Traditions','Culture')           THEN 'feste'
  -- Everyday A1 scaffolding has no exam theme; grouped as Alltag so the shelf
  -- is not dominated by an "Other" bucket.
  WHEN category IN ('Greetings','Family','Personal Info','Numbers','Time',
                    'Colors','Food & Drink','Shopping','Emotions',
                    'Core Verbs','Adjectives')                    THEN 'alltag'
  ELSE 'alltag'
END
WHERE thema IS NULL;

CREATE INDEX IF NOT EXISTS de_words_thema_idx ON public.de_words (thema);

-- ─── SCAN_RESULTS: persist a camera harvest ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scan_results (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  detected       jsonb NOT NULL DEFAULT '[]',
  total_detected integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own scans" ON public.scan_results;
CREATE POLICY "Users can manage own scans"
  ON public.scan_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS scan_results_user_idx
  ON public.scan_results (user_id, created_at DESC);
