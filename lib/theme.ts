// Pure theme rules, kept out of context/theme.tsx so they can be unit tested without React Native.

export type ThemeMode = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ui_theme';
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** Which palette to show. System follows the phone; anything else is forced. */
export function resolveScheme(mode: ThemeMode, system: Scheme | null | undefined): Scheme {
  if (mode === 'light' || mode === 'dark') return mode;
  return system === 'light' ? 'light' : 'dark';
}
