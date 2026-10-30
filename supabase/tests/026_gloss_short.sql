-- 026 gloss_short. Run against a local database with migration 026 applied:
--   docker exec -i supabase_db_einfachlernen psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/026_gloss_short.sql
-- Pure function test: no rows are written. Each check raises an error on mismatch.

DO $$
DECLARE
  c record;
  got text;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('to take care of (someone), look after', 'to take care of, look after'),
      ('dragon', 'dragon'),
      ('(to be) ready', 'ready'),
      ('(only a parenthetical)', '(only a parenthetical)'),
      ('first sense; second sense', 'first sense'),
      ('  spaced   out  ', 'spaced out'),
      ('the quick brown fox jumps over the lazy dog again and again today', 'the quick brown fox jumps over the lazy dog again and again'),
      ('', '')
    ) AS t(input, expected)
  LOOP
    got := public.gloss_short(c.input);
    IF got IS DISTINCT FROM c.expected THEN
      RAISE EXCEPTION 'gloss_short(%) = %, expected %', c.input, got, c.expected;
    END IF;
    RAISE NOTICE 'ok: % -> %', c.input, got;
  END LOOP;

  -- One word longer than the cap: no word boundary to cut at, so the first 60 characters are kept.
  got := public.gloss_short(repeat('x', 80));
  IF got IS DISTINCT FROM repeat('x', 60) THEN
    RAISE EXCEPTION 'long single word: got % characters', length(got);
  END IF;

  -- Any multi-word input stays within the cap.
  IF length(public.gloss_short(repeat('word ', 30))) > 60 THEN
    RAISE EXCEPTION 'gloss_short exceeded the 60 character cap';
  END IF;
END $$;
