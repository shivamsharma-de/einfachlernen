import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { flushReviews } from '../lib/api';
import { updateDisplayName } from '../lib/profile';
import { supabase, Profile } from '../lib/supabase';
import { identify, reset, track, type SignInFailReason, type SignInMethod } from '../lib/analytics';

WebBrowser.maybeCompleteAuthSession();

/**
 * Development auto sign-in, for device testing only.
 *
 * Runs only when BOTH env vars are set AND this is a development build (`__DEV__`).
 * Credentials live in the untracked .env.local, never in source. Production builds
 * have __DEV__ false, so this cannot run for a real learner.
 */
// Credentials come from an untracked env file (.env.local), never from source.
// Both must be set for auto sign-in to run; otherwise the app stays signed out.
const DEV_AUTO_LOGIN = __DEV__ && !!process.env.EXPO_PUBLIC_DEV_EMAIL && !!process.env.EXPO_PUBLIC_DEV_PASSWORD;
const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL ?? '';
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD ?? '';

/** Result of a sign-in attempt. `reason` is a catalogue code, never the provider's message. */
type SignInResult = { error?: string; cancelled?: boolean; reason?: SignInFailReason };

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
      if (!session && DEV_AUTO_LOGIN) {
        // Swallow failures (offline, account not yet created on this backend)
        // and fall through to the normal signed-out state rather than crash.
        const { error } = await supabase.auth.signInWithPassword({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        });
        if (error) console.warn('[dev-auto-login]', error.message);
        // onAuthStateChange below picks up the resulting session; nothing
        // further to do here on success.
        if (!error) return;
      }
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

    if (result.type !== 'success') {
      track('sign_in_failed', { method: 'google', reason_code: 'cancelled' });
      return { cancelled: true, reason: 'cancelled' };
    }

    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    if (!code) return signInFailed('google', 'no_token');

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return { ...signInFailed('google', 'provider_error'), error: exchangeError.message };

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
