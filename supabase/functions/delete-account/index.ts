// delete-account — permanently removes the signed-in learner (App Review 5.1.1(v)).
//
// Verifies the caller's session with the service role, then deletes the auth user.
// Every learner table references profiles(id) ON DELETE CASCADE, so word progress,
// review history, activity, scans, private words and preferences go with it.
//
// Apple: a learner who signed in with Apple also needs their Apple authorization
// revoked (App Review 5.1.1(v)). That needs the authorization code captured at
// sign-in and an Apple Sign-in key; it is NOT done here yet and is a blocker for
// the App Store submission. See docs/runbooks/release.md (when written).

import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'missing_authorization' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'supabase_env_missing' }, 500);

  const admin = createClient(supabaseUrl, serviceKey);

  // Identify the caller from their own token. Never trust a user id in the body.
  const { data: userData, error: userError } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (userError || !userData.user) return json({ error: 'invalid_token' }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    console.error('deleteUser failed:', deleteError.message);
    return json({ error: 'delete_failed' }, 500);
  }

  return json({ ok: true });
});
