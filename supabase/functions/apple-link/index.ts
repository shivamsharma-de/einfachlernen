// apple-link — stores the Apple refresh token for a learner who just signed in with
// Apple. Called once per Apple sign-in, right after Supabase accepts the identity
// token, because Apple's authorization code expires in about five minutes.
//
// The caller is identified from their own session token, never from the body.

import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';
import { exchangeAuthorizationCode } from '../_shared/apple.ts';

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

  const { data: userData, error: userError } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (userError || !userData.user) return json({ error: 'invalid_token' }, 401);

  // Only learners who actually signed in with Apple get a token stored.
  const isApple = userData.user.app_metadata?.provider === 'apple';
  if (!isApple) return json({ ok: true, skipped: 'not_apple' });

  let code = '';
  try {
    const body = await req.json();
    code = String(body.authorization_code ?? '');
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!code) return json({ error: 'authorization_code_required' }, 400);

  const result = await exchangeAuthorizationCode(code);
  if (!result.ok) {
    console.error('apple code exchange failed:', result.reason);
    return json({ error: 'apple_exchange_failed' }, 502);
  }

  const { error: storeError } = await admin.from('apple_auth').upsert(
    {
      user_id: userData.user.id,
      refresh_token: result.data.refreshToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (storeError) {
    console.error('apple_auth upsert failed:', storeError.message);
    return json({ error: 'store_failed' }, 500);
  }

  return json({ ok: true });
});
