-- 014_apple_auth.sql
--
-- Apple refresh tokens, kept for account deletion (App Review 5.1.1(v)).
--
-- When a learner signs in with Apple, the app sends Apple's one-time authorization
-- code here, and the server exchanges it for a refresh token. Revoking that token
-- is how the learner's Apple authorization is removed when they delete the account.
--
-- This table holds a credential, so RLS is ON with NO policies: no client role can
-- read or write it. Only the service role (Edge Functions) can. Rows are removed
-- when the profile is deleted.
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS public.apple_auth (
  user_id       uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  refresh_token text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apple_auth ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies. Do not add any without a security review.

REVOKE ALL ON public.apple_auth FROM anon, authenticated;

COMMIT;
