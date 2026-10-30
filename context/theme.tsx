/**
 * Light / dark theme. The learner chooses System, Hell or Dunkel in Profil; the choice is kept on
 * this device (AsyncStorage `ui_theme`). System follows the phone and changes live.
 *
 * `Appearance.setColorScheme` makes the native parts (switches, alerts, keyboard) follow the same
 * choice, so the app never mixes a dark Switch on a light screen.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ColorTokens } from '../constants/Colors';
import { track } from '../lib/analytics';
import { resolveScheme, THEME_MODES, THEME_STORAGE_KEY, type Scheme, type ThemeMode } from '../lib/theme';

export type { ThemeMode, Scheme } from '../lib/theme';


interface ThemeValue {
  mode: ThemeMode;
  scheme: Scheme;
  colors: ColorTokens;
  /** False until the stored choice has been read, so the first frame is already the right theme. */
  ready: boolean;
  setMode: (next: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function applyNative(mode: ThemeMode) {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  // useColorScheme reports the forced scheme when one is set, and the phone's scheme otherwise.
  const system = useColorScheme();
  const scheme = resolveScheme(mode, system);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      const next = THEME_MODES.find((m) => m === stored) ?? 'system';
      setModeState(next);
      applyNative(next);
      setReady(true);
    }).catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    applyNative(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    track('theme_changed', { theme_mode: next });
  };

  const value = useMemo<ThemeValue>(() => ({
    mode,
    scheme,
    colors: scheme === 'light' ? lightColors : darkColors,
    ready,
    setMode,
  }), [mode, scheme, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/**
 * Builds a StyleSheet from the active palette. Pass a module-level `makeStyles(c)`, so the
 * sheet is rebuilt only when the palette changes.
 */
export function useThemedStyles<T>(makeStyles: (c: ColorTokens) => T): T {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [makeStyles, colors]);
}
