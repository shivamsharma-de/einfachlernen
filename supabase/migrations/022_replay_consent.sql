-- 022_replay_consent.sql
--
-- Session replay (screen recordings for product analysis) runs only after the learner agrees.
-- The time of agreement is stored on the profile; null means not agreed. Turning it off sets it
-- back to null. Replay also stops on sign-out.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS replay_consent_at timestamptz;

COMMIT;
