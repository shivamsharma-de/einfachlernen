// Design tokens — see docs/design-spec.md §2 (dark) and §2b (light).
//
// Two palettes with identical keys. `ColorTokens` is the shape both must satisfy, so a missing
// role is a compile error. Components never import a palette directly: they read the active one
// through useTheme() (context/theme.tsx) and build styles with useThemedStyles(makeStyles).
// Dark is the original violet-on-warm-charcoal. Light is a warm cream ground with a deep violet
// accent. Gold is split: `gold` for rings, bars and icons, `goldText` for text (it fails on cream).

export type ColorTokens = {
  bg: string; surface: string; surface2: string; surface3: string; border: string;
  /** Full-screen modal ground (onboarding, tour, prompts). */
  backdrop: string;
  /** Primary text. */
  text: string;
  textMuted: string;
  /** Dividers and disabled only. Never text. */
  textDim: string;
  /** Action colour: primary buttons, active tab, selection, scan highlight. */
  purple: string; purpleBg: string;
  /** Text on a purple or gold fill. */
  onAccent: string;
  /** Track behind a progress bar sitting on a purple fill. */
  onPurpleTrack: string;
  /** Light pill / selected chip fill, and its text. */
  inverseFill: string; inverseText: string;
  /** Reward: streak, XP, level progress. Graphics. */
  gold: string; goldDark: string; goldBg: string;
  /** Reward text (streak labels, XP numbers). */
  goldText: string;
  /** Text on a gold fill. */
  onGold: string;
  green: string; greenBg: string;
  red: string; redBg: string;
  blue: string; blueBg: string;
  articleDer: string; articleDie: string; articleDas: string;
  levelA1: string; levelA2: string; levelB1: string; levelB2: string; levelC1: string; levelC2: string;
};

export const darkColors: ColorTokens = {
  bg: '#14120F',
  surface: '#1C1913',
  surface2: '#241F17',
  surface3: '#2E2820',
  border: '#332E24',
  backdrop: '#0D0C0A',
  text: '#F4F0E8',
  textMuted: '#9C968C',   // 4.9:1 on bg
  textDim: '#6B655C',
  purple: '#A67FF0',      // lightened so black text on a violet fill is legible
  purpleBg: 'rgba(166,127,240,0.14)',
  onAccent: '#0D0C0A',
  onPurpleTrack: 'rgba(13,12,10,0.25)',
  inverseFill: '#F4F0E8',
  inverseText: '#0D0C0A',
  gold: '#f5c842',
  goldDark: '#d4a017',
  goldBg: 'rgba(245,200,66,0.1)',
  goldText: '#f5c842',
  onGold: '#0D0C0A',
  green: '#2dc653',
  greenBg: 'rgba(45,198,83,0.12)',
  red: '#ea4b57',         // was #e63946: 4.49:1 on bg, now 5.0:1
  redBg: 'rgba(230,57,70,0.1)',
  blue: '#3a86ff',
  blueBg: 'rgba(58,134,255,0.1)',
  articleDer: '#3a86ff',
  articleDie: '#ea4b57',
  articleDas: '#2dc653',
  levelA1: '#4caf50', levelA2: '#8bc34a', levelB1: '#ffb300',
  levelB2: '#f5c842', levelC1: '#ff7043', levelC2: '#e91e63',
};

// Light: warm cream, not white. Text pairs measured ≥4.5:1 on bg and surface (docs/design-spec.md §2b).
export const lightColors: ColorTokens = {
  bg: '#F6F1E7',
  surface: '#FCFAF5',
  surface2: '#EEE7D9',
  surface3: '#E4DBC9',
  border: '#D9CFBB',
  backdrop: '#F6F1E7',
  text: '#1F1B16',
  textMuted: '#5F584D',   // 6.2:1 on bg
  textDim: '#A89F8E',
  purple: '#6B3FD0',      // deep violet: 5.8:1 as text on cream, white text on it 6.5:1
  purpleBg: 'rgba(107,63,208,0.10)',
  onAccent: '#FFFFFF',
  onPurpleTrack: 'rgba(255,255,255,0.3)',
  inverseFill: '#1F1B16',
  inverseText: '#F6F1E7',
  gold: '#B07C00',        // 3.3:1 on bg: passes the 3:1 for graphics
  goldDark: '#8A6100',
  goldBg: 'rgba(176,124,0,0.14)',
  goldText: '#8A6100',    // 4.9:1 on bg
  onGold: '#1F1B16',
  green: '#1E7A3A',       // 4.8:1
  greenBg: 'rgba(30,122,58,0.12)',
  red: '#C62F3B',         // 4.8:1
  redBg: 'rgba(198,47,59,0.10)',
  blue: '#2A63D1',        // 4.9:1
  blueBg: 'rgba(42,99,209,0.10)',
  articleDer: '#2A63D1',
  articleDie: '#C62F3B',
  articleDas: '#1E7A3A',
  levelA1: '#2E7D32', levelA2: '#558B2F', levelB1: '#B07C00',
  levelB2: '#8A6100', levelC1: '#D84315', levelC2: '#C2185B',
};

// Medals sit on the leaderboard in both themes; fixed, outside the design system.
export const medalColors = {
  medalGold: '#ffd700',
  medalSilver: '#c0c0c0',
  medalBronze: '#cd7f32',
} as const;

// ─── Type ────────────────────────────────────────────────────────────────────
// Faces ship as .ttf in assets/fonts/ and are loaded in app/_layout.tsx.

export const Font = {
  serif: 'InstrumentSerif_400Regular',
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemi: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
} as const;

export const Type = {
  display:  { fontFamily: Font.serif, fontSize: 52, lineHeight: 52 },
  title:    { fontFamily: Font.serif, fontSize: 30, lineHeight: 32 },
  headword: { fontFamily: Font.serif, fontSize: 38, lineHeight: 40 },
  word:     { fontFamily: Font.serif, fontSize: 19, lineHeight: 22 },
  bodyL:    { fontFamily: Font.sansSemi, fontSize: 15, lineHeight: 20 },
  body:     { fontFamily: Font.sans, fontSize: 14, lineHeight: 22 },
  caption:  { fontFamily: Font.sans, fontSize: 12.5, lineHeight: 17 },
  meta:     { fontFamily: Font.mono, fontSize: 11.5, lineHeight: 16 },
  eyebrow:  { fontFamily: Font.mono, fontSize: 9.5, lineHeight: 13, letterSpacing: 1.4,
              textTransform: 'uppercase' as const },
} as const;

// ─── Geometry ────────────────────────────────────────────────────────────────

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, gutter: 20 } as const;
export const Radius = { chip: 6, tile: 11, card: 14, pill: 999 } as const;
export const HIT = 44; // minimum tap target

// ─── SRS grades ──────────────────────────────────────────────────────────────
// Interval strings shown in the design are placeholders. The real next-interval
// comes from useSRS for the card being reviewed and is passed into GradeRow.

/** XP for each grade. Not colour, so it stays static. */
export const GRADE_XP = [2, 10, 10, 10] as const; // indexed by grade 0..3

/** Grade buttons. Built per theme, so the colours follow the active palette. */
export function gradesFor(c: ColorTokens) {
  return [
    { key: 'again', de: 'Nochmal', color: c.red,    bg: c.redBg,    xp: 2 },
    { key: 'hard',  de: 'Schwer',  color: c.gold,   bg: c.goldBg,   xp: 10 },
    { key: 'good',  de: 'Gut',     color: c.green,  bg: c.greenBg,  xp: 10 },
    { key: 'easy',  de: 'Leicht',  color: c.purple, bg: c.purpleBg, xp: 10 },
  ] as const;
}

export type GradeKey = 'again' | 'hard' | 'good' | 'easy';

// ─── Exam themes (Goethe / telc / Klett) ─────────────────────────────────────
// Canonical category strings. de_words.category is free text and is NOT yet
// normalised to these — see docs/design-spec.md §7.

export const THEMEN = [
  { id: 'arbeit',     de: 'Arbeit und Beruf',      en: 'Work & career' },
  { id: 'wohnen',     de: 'Wohnen und Umzug',      en: 'Housing & moving' },
  { id: 'gesundheit', de: 'Gesundheit',            en: 'Health' },
  { id: 'umwelt',     de: 'Umwelt und Klima',      en: 'Environment' },
  { id: 'medien',     de: 'Medien und Digitales',  en: 'Media & digital' },
  { id: 'bildung',    de: 'Bildung und Ausbildung', en: 'Education' },
  { id: 'reisen',     de: 'Reisen und Verkehr',    en: 'Travel & transport' },
  { id: 'feste',      de: 'Feste und Traditionen', en: 'Festivals & traditions' },
] as const;

export const articleColor = (c: ColorTokens) => ({ der: c.articleDer, die: c.articleDie, das: c.articleDas }) as const;

export const levelColor = (c: ColorTokens) => ({
  A1: c.levelA1, A2: c.levelA2, B1: c.levelB1, B2: c.levelB2, C1: c.levelC1, C2: c.levelC2,
}) as const;
