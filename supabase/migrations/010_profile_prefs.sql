-- 010_profile_prefs.sql
--
-- Learner preferences (PRD F6 / v1 Einstellungen) and the consent record the
-- Scan feature needs before any photo leaves the device.
--
--   card_direction   which side of the card is the question (D13 default: English first)
--   auto_speak       read the German aloud when the card is turned over
--   scan_consent_at  when the learner accepted that photos are sent to an AI
--                    provider; NULL means no consent, so scan-words must refuse
--
-- handle_new_user now also seeds display_name from the identity provider, so a
-- Google or Apple learner is not asked for a name they already gave.
--
-- Idempotent throughout.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS card_direction  text        NOT NULL DEFAULT 'en_to_de',
  ADD COLUMN IF NOT EXISTS auto_speak      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scan_consent_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_card_direction_chk CHECK (card_direction IN ('en_to_de', 'de_to_en'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    NULLIF(COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

COMMIT;
