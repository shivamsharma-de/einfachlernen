/**
 * UI language: German or English.
 *
 * Only the interface is translated. Vocabulary stays German, which is the point of
 * the app, and each card still shows the English meaning as before.
 *
 * Strings are written next to each other as `t('Deutsch', 'English')` rather than in
 * a separate key table: a string and its translation are reviewed together, and a
 * missing translation is impossible to miss.
 *
 * The choice is stored on the device. It defaults to the phone's language, so a
 * German phone opens in German and anything else opens in English.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { useAuth } from '../context/auth';
import { supabase } from './supabase';
import { track } from './analytics';

export type Lang = 'de' | 'en';

const STORAGE_KEY = 'ui_lang';

function deviceLang(): Lang {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
  return locale.toLowerCase().startsWith('de') ? 'de' : 'en';
}

type I18nValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (de: string, en: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [lang, setLangState] = useState<Lang>(deviceLang());

  // Until someone signs in, the device's own choice is used.
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'de' || stored === 'en') setLangState(stored);
    });
  }, []);

  // The signed-in account is the source of truth, so the language follows the learner to a
  // reinstall or another phone. A profile that has never chosen one takes the device's current
  // language, which is then saved to the account.
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.ui_lang === 'de' || profile.ui_lang === 'en') {
      if (profile.ui_lang !== lang) {
        setLangState(profile.ui_lang);
        void AsyncStorage.setItem(STORAGE_KEY, profile.ui_lang);
      }
    } else {
      void supabase.from('profiles').update({ ui_lang: lang }).eq('id', user.id);
    }
    // Only when the account or its saved language changes, not on every local switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.id, profile?.ui_lang]);

  const setLang = useCallback((next: Lang) => {
    track('language_changed', { lang: next });
    setLangState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
    if (user) void supabase.from('profiles').update({ ui_lang: next }).eq('id', user.id);
  }, [user]);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (de, en) => (lang === 'de' ? de : en) }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

/** Two-way DE / EN switch. Shown on the login, level and settings screens. */
export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <SegmentedToggle<Lang>
      value={lang}
      onChange={setLang}
      options={[
        { value: 'de', label: 'DE', accessibilityLabel: 'Deutsch' },
        { value: 'en', label: 'EN', accessibilityLabel: 'English' },
      ]}
    />
  );
}
