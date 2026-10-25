-- 008_review_log.sql
--
-- Append-only history of every grade a learner gives. word_progress keeps only
-- the CURRENT state of each word; this table keeps every review, which is what
-- the Fortschritt screen (activity over time, accuracy) and the "what have I
-- reviewed" view need.
--
-- The primary key is generated on the device, so an event that is retried after
-- a dropped connection is a no-op rather than a duplicate. Clients may insert and
-- read their own rows; nothing updates or deletes a review, so the history is a
-- faithful record.
--
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS throughout.

BEGIN;

CREATE TABLE IF NOT EXISTS public.review_log (
  id            uuid        PRIMARY KEY,                       -- client-generated event id
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id       text        NOT NULL,
  grade         smallint    NOT NULL CHECK (grade BETWEEN 0 AND 3),
  level         text        NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  origin        text        NOT NULL DEFAULT 'catalogue' CHECK (origin IN ('catalogue','scan')),
  interval_days integer     NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  reviewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_log_user_time_idx
  ON public.review_log (user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS review_log_user_word_idx
  ON public.review_log (user_id, word_id);

ALTER TABLE public.review_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS review_log_select_own ON public.review_log;
CREATE POLICY review_log_select_own ON public.review_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS review_log_insert_own ON public.review_log;
CREATE POLICY review_log_insert_own ON public.review_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policy: a review, once recorded, is history. Account
-- deletion removes rows through the profiles cascade, not through this table.

COMMIT;
