import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, Profile } from '../lib/supabase';
import { identify, reset } from '../lib/analytics';

WebBrowser.maybeCompleteAuthSession();

/**
 * Dev-only auto sign-in (temporary — remove once real sign-in is built).
 *
 * `_screens_auth/` is not wired into the router yet (PRD F1.1–F1.6), so there
 * is currently no reachable UI that can call `signInWithEmail`. Without a
 * session, `user` stays null forever and app/index.tsx's onboarding gate never
 * fires — the level picker and deck become unreachable by any path. Per the
 * owner: skip building sign-in for now and unblock testing instead.
 *
 * Gated on `__DEV__`, so it can never run in a production build. The account
 * is a confirmed test user created directly via the GoTrue admin API
 * (`email_confirm: true`), not through app UI.
 */
const DEV_AUTO_LOGIN = __DEV__;
const DEV_EMAIL = 'dev-tester@einfachlernen.local';
const DEV_PASSWORD = 'DevTest123!';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
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

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
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
