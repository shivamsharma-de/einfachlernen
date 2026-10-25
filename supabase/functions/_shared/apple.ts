// Apple sign-in helpers for the server side (token exchange and revocation).
//
// Apple wants a client secret that is itself a short JWT signed with the team's
// Sign in with Apple private key (ES256). The key comes from Supabase secrets
// (APPLE_PRIVATE_KEY), never from the repo or a request.
//
// ⚠ Endpoints and parameters follow Apple's "Sign in with Apple REST API" docs.
// Re-check them against Apple's current documentation before deploying.

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
const APPLE_AUDIENCE = 'https://appleid.apple.com';

type AppleEnv = { teamId: string; keyId: string; bundleId: string; privateKeyPem: string };

function appleEnv(): AppleEnv | null {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
  const pem = Deno.env.get('APPLE_PRIVATE_KEY');
  if (!teamId || !keyId || !bundleId || !pem) return null;
  // Secrets pasted into a dashboard often arrive with literal "\n" sequences.
  return { teamId, keyId, bundleId, privateKeyPem: pem.replace(/\\n/g, '\n') };
}

function base64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/** Short-lived JWT that authenticates this server to Apple as the app. */
async function clientSecret(env: AppleEnv): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(env.privateKeyPem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: env.keyId }));
  const payload = base64url(JSON.stringify({
    iss: env.teamId,
    iat: now,
    exp: now + 60 * 60 * 24 * 150, // 150 days; Apple accepts up to six months
    aud: APPLE_AUDIENCE,
    sub: env.bundleId,
  }));
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64url(signature)}`;
}

export type AppleResult<T> = { ok: true; data: T } | { ok: false; reason: string };

/**
 * Exchange the one-time authorization code from sign-in for a refresh token.
 * The code expires after about five minutes, so this must run right after sign-in.
 */
export async function exchangeAuthorizationCode(code: string): Promise<AppleResult<{ refreshToken: string }>> {
  const env = appleEnv();
  if (!env) return { ok: false, reason: 'apple_not_configured' };

  const res = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.bundleId,
      client_secret: await clientSecret(env),
      grant_type: 'authorization_code',
      code,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.refresh_token) {
    return { ok: false, reason: body.error ?? `http_${res.status}` };
  }
  return { ok: true, data: { refreshToken: body.refresh_token as string } };
}

/** Revoke a refresh token. Required when a learner deletes their account. */
export async function revokeRefreshToken(refreshToken: string): Promise<AppleResult<true>> {
  const env = appleEnv();
  if (!env) return { ok: false, reason: 'apple_not_configured' };

  const res = await fetch(APPLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.bundleId,
      client_secret: await clientSecret(env),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  return { ok: true, data: true };
}
