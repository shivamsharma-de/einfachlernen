import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { flushReviews } from '../lib/api';
import { updateDisplayName } from '../lib/profile';
import { supabase, Profile } from '../lib/supabase';
import { identify, reset } from '../lib/analytics';

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

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string; cancelled?: boolean }>;
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
        identify(session.user.id, session.user.email ? { email: session.user.email } : {});
      } else {
        setProfile(null);
        reset();
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

  async function signInWithGoogle(): Promise<{ error?: string }> {
    const redirectUrl = Linking.createURL('/auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error || !data.url) return { error: error?.message ?? 'Could not start sign-in' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success') {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) return { error: exchangeError.message };
      }
    }
    return {};
  }

  async function signInWithEmail(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  async function signUpWithEmail(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? { error: error.message } : {};
  }

  /** Apple sign-in (PRD F1.5). The raw nonce goes to Supabase; Apple only ever sees its hash. */
  async function signInWithApple(): Promise<{ error?: string; cancelled?: boolean }> {
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
      if (!credential.identityToken) return { error: 'Apple hat keinen Anmeldenachweis geliefert.' };

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) return { error: error.message };

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
      return {};
    } catch (err: unknown) {
      // The user dismissing the Apple sheet is not an error to show.
      if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return { cancelled: true };
      return { error: 'Anmeldung mit Apple ist fehlgeschlagen. Bitte erneut versuchen.' };
    }
  }

  /** Send queued grades before the session is dropped, so nothing done offline is lost. */
  async function signOut() {
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
