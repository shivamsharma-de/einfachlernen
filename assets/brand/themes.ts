// Theme pictograms for swypo. Render with react-native-svg's <SvgXml xml={...} color={fg} />.
// Each xml uses stroke="currentColor"; 24×24 grid, 1.6 stroke (use 1.4 at ≥64px, 1.7 at ≤22px).
// bg/fg are the tile colours from the design (oklch(0.33 0.07 h) / oklch(0.88 0.1 h)) as hex.

export type ThemeId = 'familie' | 'essen' | 'einkaufen' | 'wohnen' | 'kleidung' | 'freizeit' | 'wetter' | 'stadt' | 'reisen' | 'gesundheit' | 'arbeit' | 'feste' | 'bildung' | 'medien' | 'umwelt' | 'gesellschaft' | 'kultur' | 'sprache' | 'politik' | 'wirtschaft' | 'wissenschaft' | 'recht';

export interface Theme { id: ThemeId; band: string; de: string; en: string; bg: string; fg: string; xml: string }

export const THEMES: Theme[] = [
  { id: 'familie', band: 'A1–A2', de: 'Person und Familie', en: 'Family', bg: '#542523', fg: '#ffbeb6',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.2"/><path d="M15.6 14.2c3 .3 5.4 2.7 5.4 5.8"/></svg>` },
  { id: 'essen', band: 'A1–A2', de: 'Essen und Trinken', en: 'Food & drink', bg: '#4e2c07', fg: '#ffc992',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v4a2 2 0 0 0 4 0V3M6 3v18"/><path d="M12 10h7v5a3.5 3.5 0 0 1-7 0z"/><path d="M19 11.5h1a1.5 1.5 0 0 1 0 3h-1"/><path d="M14 4c0 1.5 1.5 1.5 1.5 3M17 4c0 1.5 1.5 1.5 1.5 3"/></svg>` },
  { id: 'einkaufen', band: 'A1–A2', de: 'Einkaufen', en: 'Shopping', bg: '#413400', fg: '#ecd78a',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>` },
  { id: 'wohnen', band: 'A1–B1', de: 'Wohnen', en: 'Housing', bg: '#1b3f1d', fg: '#aee9af',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/></svg>` },
  { id: 'kleidung', band: 'A1–A2', de: 'Kleidung', en: 'Clothing', bg: '#00403a', fg: '#85ede0',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4L3 7l2 4 3-1.5V20h8V9.5l3 1.5 2-4-5-3c-.6 1.5-2 2.5-4 2.5S8.6 5.5 8 4z"/></svg>` },
  { id: 'freizeit', band: 'A1–A2', de: 'Freizeit und Hobbys', en: 'Free time', bg: '#003d4e', fg: '#87e7ff',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>` },
  { id: 'wetter', band: 'A1–A2', de: 'Wetter und Natur', en: 'Weather', bg: '#1f3559', fg: '#b1d9ff',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1"/><path d="M7 19h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.5A2.8 2.8 0 0 0 7 19z"/></svg>` },
  { id: 'stadt', band: 'A1–A2', de: 'Stadt und Orientierung', en: 'Getting around', bg: '#3b2c54', fg: '#e1c9ff',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>` },
  { id: 'reisen', band: 'A2–B1', de: 'Reisen und Verkehr', en: 'Travel', bg: '#4d2641', fg: '#ffbeec',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12"/><path d="M8.5 21l2-4M15.5 21l-2-4"/><circle cx="9" cy="13.5" r=".6"/><circle cx="15" cy="13.5" r=".6"/></svg>` },
  { id: 'gesundheit', band: 'A2–B2', de: 'Gesundheit', en: 'Health', bg: '#542523', fg: '#ffbeb6',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9C20 15.4 12 20 12 20z"/><path d="M7.5 12H10l1.3-2.3 2 4 1.2-1.7h2"/></svg>` },
  { id: 'arbeit', band: 'A2–B2', de: 'Arbeit und Beruf', en: 'Work', bg: '#4e2c07', fg: '#ffc992',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/></svg>` },
  { id: 'feste', band: 'A2–B1', de: 'Feste und Traditionen', en: 'Festivals', bg: '#413400', fg: '#ecd78a',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="1"/><path d="M3 7h18v3H3zM12 7v13"/><path d="M12 7c-1-3-5-3.2-4.5-.6M12 7c1-3 5-3.2 4.5-.6"/></svg>` },
  { id: 'bildung', band: 'B1–B2', de: 'Bildung und Ausbildung', en: 'Education', bg: '#1b3f1d', fg: '#aee9af',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v5"/></svg>` },
  { id: 'medien', band: 'B1–B2', de: 'Medien und Digitales', en: 'Media', bg: '#00403a', fg: '#85ede0',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10.5 9.5v5l4-2.5z"/></svg>` },
  { id: 'umwelt', band: 'B1–C1', de: 'Umwelt und Klima', en: 'Environment', bg: '#003d4e', fg: '#87e7ff',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C5 10 10 5 20 4c0 9-5 15-13 15z"/><path d="M5 19l8-8"/></svg>` },
  { id: 'gesellschaft', band: 'B1–B2', de: 'Gesellschaft', en: 'Society', bg: '#1f3559', fg: '#b1d9ff',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h11v7H8l-3 3v-3H3z"/><path d="M14 9h7v7h-2v3l-3-3h-6v-2"/></svg>` },
  { id: 'kultur', band: 'B2–C1', de: 'Kultur und Kunst', en: 'Culture', bg: '#3b2c54', fg: '#e1c9ff',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5.9-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="9.5" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/></svg>` },
  { id: 'sprache', band: 'B2–C2', de: 'Sprache und Kommunikation', en: 'Language', bg: '#4d2641', fg: '#ffbeec',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/></svg>` },
  { id: 'politik', band: 'C1–C2', de: 'Politik', en: 'Politics', bg: '#542523', fg: '#ffbeb6',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5M4 20h16M6 10v8M10 10v8M14 10v8M18 10v8"/></svg>` },
  { id: 'wirtschaft', band: 'C1–C2', de: 'Wirtschaft und Finanzen', en: 'Economy', bg: '#4e2c07', fg: '#ffc992',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M5 16l4-5 3 3 6-7"/><path d="M15 7h3v3"/></svg>` },
  { id: 'wissenschaft', band: 'C1–C2', de: 'Wissenschaft und Forschung', en: 'Science', bg: '#1b3f1d', fg: '#aee9af',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/></svg>` },
  { id: 'recht', band: 'C1–C2', de: 'Recht und Justiz', en: 'Law', bg: '#003d4e', fg: '#87e7ff',
    xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M8 20h8M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/></svg>` },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map(t => [t.id, t])) as Record<ThemeId, Theme>;
