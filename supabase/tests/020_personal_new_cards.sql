-- 020 personal new cards. Run against a local database with migration 020 applied:
--   docker exec -i supabase_db_einfachlernen psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/020_personal_new_cards.sql
-- Runs in one transaction that is rolled back.

BEGIN;

insert into auth.users (id,email,aud,role,created_at,updated_at,instance_id)
values ('aaaaaaaa-0000-0000-0000-00000000000a','pnc@local.test','authenticated','authenticated',now(),now(),'00000000-0000-0000-0000-000000000000') on conflict do nothing;
insert into public.profiles (id) values ('aaaaaaaa-0000-0000-0000-00000000000a') on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}',true);

\echo '1. import two personal words and one catalogue word: expect progress only for the catalogue word'
select public.import_scan_words(null, array['de-a1-al-0002'],
  '[{"german":"Zauberstab","article":"der","word_type":"noun","english":"magic wand","level":"A1","forms":{},"example_de":"","example_en":"","synonyms":[],"uncertain":false},
    {"german":"Drache","article":"der","word_type":"noun","english":"dragon","level":"A1","forms":{},"example_de":"","example_en":"","synonyms":[],"uncertain":false}]'::jsonb,
  '2026-10-29'::date);
select word_id from public.word_progress where user_id='aaaaaaaa-0000-0000-0000-00000000000a' order by 1;

\echo '2. personal new cards with cap 5: expect both personal words'
select german from public.next_personal_words(array['A1'], 5, '2026-10-29'::date) order by german;

\echo '3. a word in another level is not offered: expect none'
select count(*) from public.next_personal_words(array['B2'], 5, '2026-10-29'::date);

\echo '4. grade the first personal word: expect progress row, origin scan in review_log'
select public.record_review('c0000000-0000-0000-0000-000000000001', (select id from public.user_words where german='Zauberstab' and user_id='aaaaaaaa-0000-0000-0000-00000000000a'),
  2::smallint,'A1','scan','2026-10-29 09:00+00'::timestamptz,1,1,2.5,0,'2026-10-30'::date,false,'d0000000-0000-0000-0000-000000000001'::uuid,'2026-10-29'::date);

\echo '5. started today: expect 1'
select public.personal_introduced_today('2026-10-29'::date);

\echo '6. graded word leaves the new pool: expect only Drache'
select german from public.next_personal_words(array['A1'], 5, '2026-10-29'::date);

\echo '7. cap reached: cap 1 with one already started today leaves nothing: expect 0'
select count(*) from public.next_personal_words(array['A1'], 1, '2026-10-29'::date);

\echo '8. a new day restores the allowance: expect Drache again at cap 1'
select german from public.next_personal_words(array['A1'], 1, '2026-10-30'::date);

\echo '9. default allowance is five a day'
select daily_personal_cards from public.profiles where id='aaaaaaaa-0000-0000-0000-00000000000a';

ROLLBACK;
