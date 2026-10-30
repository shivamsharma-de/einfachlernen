-- 026 test options: keep the English gloss readable.
--
-- Migration 016 cut every option at the first comma and at 32 characters, and removed every
-- "(...)" group, so "to take care of (someone), look after" became "to take care of" and long
-- glosses were chopped mid-word. start_test (017, 021) calls gloss_short for each option, so
-- redefining it here changes the options of every test started after this migration.
-- Tests already in progress keep their frozen options.
--
-- New rule:
--   1. Use the first sense only (text before ';'). Commas stay, so synonyms are shown together.
--   2. Remove "(...)" clarifications, but only when something else is left to show.
--   3. Cap at 60 characters, cut at a word boundary. Never cut inside a word.

CREATE OR REPLACE FUNCTION public.gloss_short(p_english text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_full     text;
  v_stripped text;
  v_out      text;
  v_cut      text;
BEGIN
  v_full := btrim(regexp_replace(split_part(COALESCE(p_english, ''), ';', 1), '\s+', ' ', 'g'));
  v_stripped := btrim(regexp_replace(v_full, '\([^)]*\)', '', 'g'));
  -- Removing "(...)" can leave a space before punctuation: "of (someone), look" -> "of , look".
  v_stripped := btrim(regexp_replace(v_stripped, '\s+([,.;:!?])', '\1', 'g'));
  v_stripped := btrim(regexp_replace(v_stripped, '\s+', ' ', 'g'));

  v_out := CASE WHEN v_stripped <> '' THEN v_stripped ELSE v_full END;

  IF length(v_out) > 60 THEN
    -- Cut before the 61st character if that character is a space; otherwise drop the partial word.
    v_cut := CASE
      WHEN substr(v_out, 61, 1) = ' ' THEN left(v_out, 60)
      ELSE regexp_replace(left(v_out, 60), '\s+\S*$', '')
    END;
    -- A single word longer than the cap has no boundary to cut at: keep the first 60 characters.
    v_out := CASE WHEN btrim(v_cut) = '' THEN left(v_out, 60) ELSE v_cut END;
  END IF;

  RETURN btrim(v_out);
END;
$$;
