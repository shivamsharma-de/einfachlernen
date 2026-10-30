-- 023_session_tracking_prompt.sql
--
-- Session tracking (PostHog session replay) is asked once, with a popup: in onboarding for new
-- learners, and on the next launch for learners who finished onboarding before the popup existed.
-- session_tracking_asked_at records that the question was answered, whichever answer was given.
-- The answer itself is replay_consent_at (migration 022): null = off.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS session_tracking_asked_at timestamptz;

COMMIT;
