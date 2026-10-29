// Drop-in replacement for constants/Colors.ts
// Same keys as the current file. Changed values are commented with their previous value.
// Rationale and contrast notes: handoff/design-spec.md §2

export const Colors = {
  black: '#0D0C0A',       // was #0d0d0d — warmed
  bg: '#14120F',          // was #111111 — warmed
  surface: '#1C1913',     // was #1a1a1a
  surface2: '#241F17',    // was #242424
  surface3: '#2E2820',    // was #2e2e2e
  border: '#332E24',      // was #333333

  // Reward colour: streak, XP, level progress. Unchanged.
  gold: '#f5c842',
  goldDark: '#d4a017',
  goldBg: 'rgba(245,200,66,0.1)',

  green: '#2dc653',
  greenBg: 'rgba(45,198,83,0.12)',

  red: '#e63946',
  redBg: 'rgba(230,57,70,0.1)',

  blue: '#3a86ff',
  blueBg: 'rgba(58,134,255,0.1)',

  // Action colour: primary buttons, active tab, selection, scan highlight.
  // Lightened from #8338ec so black text on a violet fill is legible.
  purple: '#A67FF0',                    // was #8338ec
  purpleBg: 'rgba(166,127,240,0.14)',   // was rgba(131,56,236,0.12)

  white: '#F4F0E8',       // was #f5f5f0 — warmed
  textMuted: '#9C968C',   // was #888888 — 4.9:1 on bg, safe for 9-12px labels
  textDim: '#6B655C',     // was #555555 — dividers and disabled only, NEVER text

  articleDer: '#3a86ff',
  articleDie: '#e63946',
  articleDas: '#2dc653',

  levelA1: '#4caf50',
  levelA2: '#8bc34a',
  levelB1: '#ffb300',
  levelB2: '#f5c842',
  levelC1: '#ff7043',
  levelC2: '#e91e63',
} as const;

export type ColorKey = keyof typeof Colors;

// ─── Type ────────────────────────────────────────────────────────────────────
// Requires expo-font + assets/fonts/. Fall back to system sans if only one
// family can be shipped — keep the serif, it carries the identity.

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
// Interval strings shown in the design are placeholders. Replace `interval`
// with the real value from useSRS for the card being reviewed.

export const GRADES = [
  { key: 'again', de: 'Nochmal', color: Colors.red,    bg: Colors.redBg,    xp: 2 },
  { key: 'hard',  de: 'Schwer',  color: Colors.gold,   bg: Colors.goldBg,   xp: 10 },
  { key: 'good',  de: 'Gut',     color: Colors.green,  bg: Colors.greenBg,  xp: 10 },
  { key: 'easy',  de: 'Leicht',  color: Colors.purple, bg: Colors.purpleBg, xp: 10 },
] as const;

// ─── Exam themes (Goethe / telc / Klett) ─────────────────────────────────────
// Canonical category strings. Normalise de_words.category to these before
// grouping the Themen shelf.

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

export const ARTICLE_COLOR = {
  der: Colors.articleDer,
  die: Colors.articleDie,
  das: Colors.articleDas,
} as const;

export const LEVEL_COLOR = {
  A1: Colors.levelA1, A2: Colors.levelA2, B1: Colors.levelB1,
  B2: Colors.levelB2, C1: Colors.levelC1, C2: Colors.levelC2,
} as const;
