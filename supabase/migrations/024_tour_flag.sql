-- 024_tour_flag.sql
--
-- The first-run tour (six short steps through the tabs) is shown once per account. The time it was
-- finished is stored on the profile; null means not finished yet.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;

COMMIT;
