import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { flushReviews } from '../lib/api';
import { updateDisplayName } from '../lib/profile';
import { supabase, Profile } from '../lib/supabase';
import { identify, reset, setReplayConsent, track, type SignInFailReason, type SignInMethod } from '../lib/analytics';

WebBrowser.maybeCompleteAuthSession();

/** Result of a sign-in attempt. `reason` is a catalogue code, never the provider's message. */
type SignInResult = { error?: string; cancelled?: boolean; reason?: SignInFailReason };

/**
 * Exchanges a PKCE code for a session. Shared by the in-flight Google sign-in and the
 * /auth/callback route, so the same code is never redeemed twice (the second attempt
 * would fail because the code verifier is already consumed).
 */
const pendingExchanges = new Map<string, Promise<{ error?: string }>>();

export function completeOAuthCode(code: string): Promise<{ error?: string }> {
  let pending = pendingExchanges.get(code);
  if (!pending) {
    pending = supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => (error ? { error: error.message } : {}));
    pendingExchanges.set(code, pending);
  }
  return pending;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<SignInResult>;
  signInWithEmail: (email: string, password: string) => Promise<SignInResult>;
  signInWithApple: () => Promise<SignInResult>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Whether an account was signed in before the latest auth event. Analytics is reset only
  // on a real sign-out, not on every launch that starts signed out.
  const wasSignedIn = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // The Supabase user id only. The email is never sent to analytics.
        identify(session.user.id);
        wasSignedIn.current = true;
      } else {
        setProfile(null);
        if (wasSignedIn.current) reset();
        wasSignedIn.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
    // Replay runs only while the learner has agreed to it on this account.
    setReplayConsent(!!data?.replay_consent_at);
    setLoading(false);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  /** Records a failed attempt. Only the catalogue reason is sent, never the message. */
  function signInFailed(method: SignInMethod, reason: SignInFailReason): SignInResult {
    track('sign_in_failed', { method, reason_code: reason });
    return { error: undefined, reason };
  }

  async function signInWithGoogle(): Promise<SignInResult> {
    track('sign_in_started', { method: 'google' });
    const redirectUrl = Linking.createURL('/auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error || !data.url) {
      const failed = signInFailed('google', 'provider_error');
      return { ...failed, error: error?.message ?? 'Could not start sign-in' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (__DEV__) console.log('google sign-in', { redirectUrl, resultType: result.type, returned: result.type === 'success' ? result.url.split('#')[0].split('?')[0] : null });

    if (result.type !== 'success') {
      track('sign_in_failed', { method: 'google', reason_code: 'cancelled' });
      return { cancelled: true, reason: 'cancelled' };
    }

    // Two shapes come back: `?code=` when the client uses PKCE, and tokens in the `#` fragment
    // when it uses the implicit flow (supabase-js's default). Both are accepted.
    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');

    if (code) {
      const { error: exchangeError } = await completeOAuthCode(code);
      if (exchangeError) return { ...signInFailed('google', 'provider_error'), error: exchangeError };
    } else if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) return { ...signInFailed('google', 'provider_error'), error: sessionError.message };
    } else {
      return signInFailed('google', 'no_token');
    }

    track('sign_in_completed', { method: 'google' });
    return {};
  }

  async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
    track('sign_in_started', { method: 'email' });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ...signInFailed('email', 'provider_error'), error: error.message };
    track('sign_in_completed', { method: 'email' });
    return {};
  }

  async function signUpWithEmail(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? { error: error.message } : {};
  }

  /** Apple sign-in (PRD F1.5). The raw nonce goes to Supabase; Apple only ever sees its hash. */
  async function signInWithApple(): Promise<SignInResult> {
    track('sign_in_started', { method: 'apple' });
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        return { ...signInFailed('apple', 'no_token'), error: 'Apple hat keinen Anmeldenachweis geliefert.' };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) return { ...signInFailed('apple', 'provider_error'), error: error.message };

      // Apple's authorization code expires in about five minutes, so hand it to the
      // server right away. The server keeps the refresh token needed to revoke this
      // authorization when the learner deletes their account. A failure here must not
      // block sign-in; deletion will report it if the token is missing.
      if (credential.authorizationCode) {
        const { error: linkError } = await supabase.functions.invoke('apple-link', {
          body: { authorization_code: credential.authorizationCode },
        });
        if (linkError) console.warn('[apple-link] could not store token:', linkError.message);
      }

      // Apple returns the name only on the very first sign-in, so save it now.
      const given = credential.fullName?.givenName ?? '';
      const family = credential.fullName?.familyName ?? '';
      const name = `${given} ${family}`.trim();
      if (name && data.user) await updateDisplayName(data.user.id, name);
      track('sign_in_completed', { method: 'apple' });
      return {};
    } catch (err: unknown) {
      // The user dismissing the Apple sheet is not an error to show.
      if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
        track('sign_in_failed', { method: 'apple', reason_code: 'cancelled' });
        return { cancelled: true, reason: 'cancelled' };
      }
      return {
        ...signInFailed('apple', 'unknown'),
        error: 'Anmeldung mit Apple ist fehlgeschlagen. Bitte erneut versuchen.',
      };
    }
  }

  /** Send queued grades before the session is dropped, so nothing done offline is lost. */
  async function signOut() {
    track('sign_out');
    if (user) await flushReviews(user.id);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithApple,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
