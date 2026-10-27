-- 015 stats persistence checks. Run against the local database after `supabase db reset`:
--   docker exec -i supabase_db_einfachlernen psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/015_stats.sql
-- Each block states what it expects. A failing expectation shows as an unexpected value or an error.

insert into auth.users (id,email,aud,role,created_at,updated_at,instance_id)
values ('55555555-5555-5555-5555-555555555555','stats@local.test','authenticated','authenticated',now(),now(),'00000000-0000-0000-0000-000000000000') on conflict do nothing;
insert into auth.users (id,email,aud,role,created_at,updated_at,instance_id)
values ('66666666-6666-6666-6666-666666666666','other@local.test','authenticated','authenticated',now(),now(),'00000000-0000-0000-0000-000000000000') on conflict do nothing;
insert into public.profiles (id) values ('55555555-5555-5555-5555-555555555555'),('66666666-6666-6666-6666-666666666666') on conflict do nothing;

BEGIN;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',true);
\echo '1. three reviews: grade 0 = 2 xp, grade 2 = 10 xp each'
select public.record_review('a0000000-0000-0000-0000-000000000001','de-a1-al-0002',2::smallint,'A1','catalogue','2026-10-27 09:00+00'::timestamptz,1,1,2.5,0,'2026-10-28'::date,false,'b0000000-0000-0000-0000-000000000001'::uuid,'2026-10-27'::date);
select public.record_review('a0000000-0000-0000-0000-000000000002','de-a1-al-0003',0::smallint,'A1','catalogue','2026-10-27 09:01+00'::timestamptz,0,0,2.3,1,'2026-10-27'::date,false,'b0000000-0000-0000-0000-000000000001'::uuid,'2026-10-27'::date);
select public.record_review('a0000000-0000-0000-0000-000000000003','de-a1-al-0004',2::smallint,'A1','catalogue','2026-10-27 09:02+00'::timestamptz,1,1,2.5,0,'2026-10-28'::date,false,'b0000000-0000-0000-0000-000000000001'::uuid,'2026-10-27'::date);
\echo '2. replay of event 1: expect recorded=false, nothing added'
select public.record_review('a0000000-0000-0000-0000-000000000001','de-a1-al-0002',2::smallint,'A1','catalogue','2026-10-27 09:00+00'::timestamptz,1,1,2.5,0,'2026-10-28'::date,false,'b0000000-0000-0000-0000-000000000001'::uuid,'2026-10-27'::date);
\echo '3. session totals: expect cards 3, xp 22'
select cards_reviewed, xp from study_sessions where id='b0000000-0000-0000-0000-000000000001';
\echo '4. time 120s, then a stale 90s, then 300s: expect 120, 120, 300'
select public.touch_session('b0000000-0000-0000-0000-000000000001','review',120,'2026-10-27'::date);
select public.touch_session('b0000000-0000-0000-0000-000000000001','review',90,'2026-10-27'::date);
select public.touch_session('b0000000-0000-0000-0000-000000000001','review',300,'2026-10-27'::date);
\echo '5. day totals: expect cards 3, xp 22, seconds 300'
select cards_reviewed, xp_earned, seconds from daily_activity where user_id='55555555-5555-5555-5555-555555555555';
\echo '6. profile xp: expect 22'
select xp from profiles where id='55555555-5555-5555-5555-555555555555';
\echo '7. streak on 27 Oct: expect 1 (a cards-only day counts)'
select public.current_streak('2026-10-27'::date);
\echo '8. summary'
select public.activity_summary('2026-10-27'::date);
COMMIT;

\echo '9. other user cannot write into this session: expect session_not_found'
BEGIN;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}',true);
\set ON_ERROR_STOP 0
select public.touch_session('b0000000-0000-0000-0000-000000000001','review',9999,'2026-10-27'::date);
\set ON_ERROR_STOP 1
COMMIT;
reset role;
\echo '10. session time unchanged: expect 300'
select active_seconds from study_sessions where id='b0000000-0000-0000-0000-000000000001';
