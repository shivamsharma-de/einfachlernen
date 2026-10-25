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
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Type, Space, Radius, HIT } from '../constants/Colors';

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
  const [lang, setLangState] = useState<Lang>(deviceLang());

  // Restore the learner's own choice once the device storage is read.
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'de' || stored === 'en') setLangState(stored);
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

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
  const option = (value: Lang, label: string) => {
    const on = lang === value;
    return (
      <TouchableOpacity
        key={value}
        onPress={() => setLang(value)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={value === 'de' ? 'Deutsch' : 'English'}
        style={[styles.option, on && styles.optionOn]}
        activeOpacity={0.85}
      >
        <Text style={[styles.label, on && styles.labelOn]}>{label}</Text>
      </TouchableOpacity>
    );
  };
  return <View style={styles.row}>{option('de', 'DE')}{option('en', 'EN')}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'center', gap: Space.xs },
  option: {
    minWidth: HIT, minHeight: HIT, paddingHorizontal: Space.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.textMuted,
  },
  optionOn: { borderColor: Colors.purple, backgroundColor: Colors.purpleBg },
  label: { ...Type.meta, color: Colors.textMuted },
  labelOn: { color: Colors.white },
});
