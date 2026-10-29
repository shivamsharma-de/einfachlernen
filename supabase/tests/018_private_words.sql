-- 018 private words checks. Run against a local database with migration 018 applied:
--   docker exec -i supabase_db_einfachlernen psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/018_private_words.sql
-- Everything runs inside one transaction that is rolled back, so no test data is left behind.
-- Each block states what it expects.

BEGIN;

insert into auth.users (id,email,aud,role,created_at,updated_at,instance_id)
values ('77777777-7777-7777-7777-777777777777','priv-a@local.test','authenticated','authenticated',now(),now(),'00000000-0000-0000-0000-000000000000'),
       ('88888888-8888-8888-8888-888888888888','priv-b@local.test','authenticated','authenticated',now(),now(),'00000000-0000-0000-0000-000000000000')
on conflict do nothing;
insert into public.profiles (id) values ('77777777-7777-7777-7777-777777777777'),('88888888-8888-8888-8888-888888888888') on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}',true);

\echo '1. user A imports one catalogue word and one AI word: expect imported 2, two word_ids'
select public.import_scan_words(null,
  array['de-a1-al-0002'],
  '[{"german":"Zauberstab","article":"der","word_type":"noun","english":"magic wand","level":"A1","forms":{},"example_de":"Der Zauberstab ist alt.","example_en":"The wand is old.","uncertain":false}]'::jsonb,
  '2026-10-29'::date);

\echo '2. replay the same import: expect imported 0, and the same ids come back'
select public.import_scan_words(null,
  array['de-a1-al-0002'],
  '[{"german":"zauberstab","article":"der","word_type":"noun","english":"magic wand","level":"A1","forms":{},"example_de":"","example_en":"","uncertain":false}]'::jsonb,
  '2026-10-29'::date);

\echo '3. progress: expect only the catalogue word (personal words start as new cards); the AI word has meaning_source ai'
select wp.word_id, wp.added_via from public.word_progress wp where wp.user_id='77777777-7777-7777-7777-777777777777' order by 1;
select german, meaning_source, uncertain from public.user_words where user_id='77777777-7777-7777-7777-777777777777';

\echo '4. user A sees the private word on the deck: expect one row with origin scan'
select id, origin from public.deck_words where id like 'u\_%' and id in (select id from public.user_words where user_id='77777777-7777-7777-7777-777777777777');

\echo '5. word_lights for A excludes the private word: expect only the catalogue id'
select word_id from public.word_lights(array['A1']);

\echo '6. start_test never offers the private word: expect no Zauberstab in the questions'
select (public.start_test(array['A1'], 10, '2026-10-29'::date))::text like '%Zauberstab%' as leaked;

\echo '7. user B cannot see A''s private word: expect 0'
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}',true);
select count(*) from public.user_words;

\echo '8. user B cannot edit or delete it: expect 0 rows updated, delete_user_word false'
update public.user_words set english='hacked' where german='Zauberstab';
select public.delete_user_word((select id from public.user_words where german='Zauberstab' limit 1)) as deleted_by_b;

\echo '9. user B may add a shared catalogue word to her own deck (imported 1), but gets no rows of A: expect imported 1, word_ids only the catalogue id'
select public.import_scan_words(null, array['de-a1-al-0002'], '[]'::jsonb, '2026-10-29'::date);

\echo '10. user A deletes the private word: expect true, progress removed, catalogue progress kept'
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}',true);
select public.delete_user_word((select id from public.user_words where user_id='77777777-7777-7777-7777-777777777777' and german='Zauberstab')) as deleted;
select word_id from public.word_progress where user_id='77777777-7777-7777-7777-777777777777' order by 1;

\echo '11. delete_user_word refuses catalogue ids: expect false'
select public.delete_user_word('de-a1-al-0002') as refused;

ROLLBACK;
