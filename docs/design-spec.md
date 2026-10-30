# swapo — Design handoff

Source design: `Einfach Lernen.dc.html` (HTML prototype, 6 options).
Target repo: `shivamsharma-de/einfachlernen` @ `main` (Expo 54, expo-router, Supabase, TypeScript).

This spec is written to be implemented **inside the existing app**, not as a rewrite. Where the design
disagrees with what is already in the repo, the disagreement is called out explicitly with a recommendation.

---

## 1. What already exists vs. what the design adds

| Design screen (prototype) | Repo status | Action |
|---|---|---|
| Home / Heute (`1a` tab 1, `1b`, `1c`) | `app/(tabs)/index.tsx` exists — CEFR level grid | **Rework** |
| Progress / Profil (`1a` tab 5, `1f`) | Partly in `app/(tabs)/leaderboard.tsx` | **New screen**, keep leaderboard separate |
| Deck review, SRS (`1a` tab 4, `1e`) | `app/(tabs)/quiz.tsx` is multiple-choice + hearts, not SRS | **New mode** alongside quiz |
| Dictionary entry (`1a` tab 3) | none | **New** |
| Camera scan → word harvest (`1a` tab 2, `1d`) | none | **New**, needs native module |
| Kapitel / Thema browser | none (`Word.category` exists in data) | **New**, not yet designed |
| Phrases / Redemittel | `app/(tabs)/phrases.tsx` exists | untouched by this design |

Two structural notes on the repo before starting:

1. `_screens_auth/` holds `(auth)`, `(onboarding)` and `auth/callback` **outside** the `app/` directory, so
   expo-router never mounts them. If onboarding and the level picker are meant to be live, they need to move
   into `app/`. The design assumes level selection is reachable, and also exposes it as chips on Home.
2. `docs/technical-architecture.md` describes `components/`, `data/vocabulary.ts` and `hooks/useSRS.ts`.
   None of the three exist yet. Content actually comes from Supabase (`lib/db.ts` → `de_words`,
   `de_redemittel`), and there is no SRS implementation. The deck screen in this design needs `useSRS.ts`
   written for real; the algorithm in §5 of the architecture doc (SM-2 lite) is what the design is drawn against.

---

## 2. Colour

The repo's `constants/Colors.ts` is gold-on-neutral-black. The design is **violet-on-warm-charcoal with gold
kept for streak and XP**. That is a small, compatible shift, not a new palette:

- gold `#f5c842` stays exactly as-is, but its role narrows to **streak, XP, level progress** — the reward colour.
- **violet becomes the action colour** (primary buttons, active tab, selection, scan highlight). The repo already
  has `purple: '#8338ec'`; it is too dark and too saturated to carry text at 14px. Replace its *value*, keep its key.
- the neutral ramp warms by a few degrees of hue. Same lightness steps, so nothing else in the app shifts.
- `textMuted: '#888888'` and `textDim: '#555555'` fail contrast on small labels (`#555` is ~2.4:1 on `#111`).
  Both are lifted. Do not use `textDim` for text at all — border/divider only.

Apply as a patch to `constants/Colors.ts` (full replacement file is in `handoff/tokens.ts`):

```ts
// changed
bg:        '#14120F',   // was #111111
surface:   '#1C1913',   // was #1a1a1a
surface2:  '#241F17',   // was #242424
surface3:  '#2E2820',   // was #2e2e2e
border:    '#332E24',   // was #333333
black:     '#0D0C0A',   // was #0d0d0d
white:     '#F4F0E8',   // was #f5f5f0
purple:    '#A67FF0',   // was #8338ec  — now the primary action colour
purpleBg:  'rgba(166,127,240,0.14)',
textMuted: '#9C968C',   // was #888888  — 4.9:1 on bg
textDim:   '#6B655C',   // was #555555  — dividers/disabled only, never text

// unchanged: gold, goldDark, goldBg, green, greenBg, red, redBg, blue, blueBg,
//            articleDer/Die/Das, levelA1…levelC2
```

**Article colours are already correct** and the design uses them exactly as the repo defines them:
`der` blue, `die` red, `das` green — shown as a small mono `der/die/das` before the headword, never as a
background on the word itself.

**Level colours** (`levelA1`…`levelC2`) are used **only** in the vocabulary-progress bars of option `1f`.
Level chips elsewhere are neutral (selected = `white` fill, `black` text; unselected = `border` outline) —
six saturated chips in a row reads as decoration and competes with the article colours.

Grade buttons in the deck screen map to existing keys: `red` / `gold` / `green` / `purple` at 13% alpha fill
with a 40% alpha border.

---

### 2b. Light theme

The app has two palettes with identical keys: `darkColors` and `lightColors` in `constants/Colors.ts`.
The learner picks System, Hell or Dunkel in Profil (default System, stored on the device).

- **Ground:** warm cream `#F6F1E7`, not white. Cards `#FCFAF5`. Violet stays the action colour, darkened to `#6B3FD0` so it reads as text on cream and white reads on it.
- **Text:** warm near-black `#1F1B16`, muted `#5F584D`. `textDim` is still for dividers only.
- **Gold is split.** `gold` (`#B07C00`) is for rings, bars and icons (3:1 on cream). `goldText` (`#8A6100`) is for text. The dark gold `#F5C842` fails on cream and must not be used as text in light.
- **Text on fills** uses `onAccent` (white on violet), `onGold` (near-black on gold) and `inverseText`/`inverseFill` (a light pill in dark, a dark pill in light).
- **Contrast:** every text pair is at least 4.5:1 in both themes. `constants/Colors` is covered by `lib/__tests__/theme.test.ts`.
- **Topic tiles** keep their dark colours in light mode, so they read as coloured badges on the cream.

## 3. Type

The prototype uses three families. React Native has none of them by default — add `expo-font` and load:

| Role | Family | Where |
|---|---|---|
| German headwords, screen titles, big numbers | **Instrument Serif** 400 | word rows, dictionary headword, card front, section titles |
| All UI, English text, body | **IBM Plex Sans** 400/500/600 | everything else |
| Metadata, labels, levels, intervals | **IBM Plex Mono** 500 | `B2`, `f · -n`, `+ Akk`, `6 TAGE`, section eyebrows |

Both are OFL-licensed and available from Google Fonts; ship the `.ttf`s in `assets/fonts/` rather than
fetching at runtime. If only one custom family is affordable, load **Instrument Serif** and fall back to
system sans for UI — the serif on German nouns is what carries the identity.

Scale (all values as they appear in the prototype):

| Token | Size / weight / family | Use |
|---|---|---|
| `display` | 52–56 Serif | Home hero (`1c`), vocabulary count (`1f`) |
| `title` | 29–33 Serif | screen titles |
| `headword` | 37–40 Serif | dictionary headword, card front |
| `word` | 18–19 Serif | word rows in lists |
| `bodyL` | 15 Sans 600 | section headers, buttons |
| `body` | 13.5–14.5 Sans 400 | translations, examples, hints |
| `caption` | 12–12.5 Sans 400 | English glosses under German |
| `meta` | 11–12 Mono 400/500 | grammar, plural, IPA |
| `eyebrow` | 9–10 Mono 500, letter-spacing 0.14–0.16em, uppercase | section labels |

`eyebrow` is the smallest type in the system and therefore the one that must never drop below `textMuted`.
Everything under ~13px uses `white` or `textMuted`, never an alpha of either.

---

## 4. Geometry and spacing

- Screen gutter **20px**; card inner padding **17–19px**.
- Radii: cards `14`, tiles/thumbs `10–12`, small chips/checkboxes `5–7`, buttons and level chips **999** (pill).
- Vertical rhythm: 8 / 12 / 16 / 20 / 24 between blocks. Section header → first row is 8–10.
- Rows are separated by a `1px` `border` hairline, not by gaps, in dictionary and word lists.
- Horizontal shelves (`kapitel`, badges) scroll with 12px gaps and 20px end padding, thumbs 150px wide.
- Tap targets: every row, chip and grade button is ≥44px tall. The grade row is a 4-column grid with 7px gaps
  at 13px vertical padding + label — verify on a 375pt device that it still clears 44.

---

## 5. Components to build (`components/`)

The repo has no `components/` directory. Create it; each of these appears on 2+ screens.

| Component | Props | Notes |
|---|---|---|
| `LevelChipRow` | `levels`, `value`, `onChange` | horizontal scroll, neutral fill when selected |
| `WordRow` | `word: Word`, `right?`, `onPress` | article in `articleX` colour, German serif, English caption, level badge right |
| `LevelBadge` | `level: CEFRLevel` | mono, `surface2` fill, `textMuted` text |
| `Eyebrow` | `children`, `right?` | the uppercase mono section label |
| `ProgressRing` | `pct`, `size`, `color`, `label` | conic gradient in the web design; in RN use `react-native-svg` `Circle` with `strokeDasharray` — do **not** try to reproduce the conic gradient |
| `StatPair` | `value`, `label` | the number-over-mono-label unit used on Home and Progress |
| `SectionShelf` | `title`, `children` | horizontal scroll container with the standard gutters |
| `PillButton` | `label`, `variant: primary \| ghost \| light` | primary = `purple` fill + `black` text |
| `GradeRow` | `onGrade(0..3)` | the four SRS buttons with their intervals |
| `WordCard` | `word`, `revealed`, `onFlip` | deck card, `surface` fill, `border` hairline |

`ProgressRing` is the one place the web prototype and RN genuinely diverge. Everything else is a direct
translation of View/Text with the tokens above.

---

## 6. Screen specs

### 6.1 Home — `app/(tabs)/index.tsx` (rework)

Order, top to bottom:
1. Greeting block: mono date eyebrow, serif "Guten Morgen." with a violet period, English caption; current
   level in a 50px circle on the right (tapping it opens the level picker).
2. `LevelChipRow`, A1–C2. Changing it re-filters everything below (`fetchWordsByLevel`).
3. **Daily goal card**: `ProgressRing` of minutes/15 in gold, due-card count, and two `StatPair`s — streak
   in gold, XP with "STUFE n". Minutes-studied is not currently tracked anywhere; add it to `LocalProgress`.
4. **Continue card**, violet fill, black text: current Kapitel, English subtitle, "18 von 40 Wörtern",
   4px progress bar. This is the only violet-filled block on the screen — it is the primary action.
5. **Themen shelf**: 150px tiles per `Word.category`, filtered to the selected level. Tile art is a striped
   placeholder in the prototype; if real imagery is coming, it drops in here unchanged.
6. **Fällig heute**: `WordRow` list from SRS state where `nextReviewAt <= today`.

Alternatives to decide between before building: `1b` restructures Home as stacked horizontal shelves
(denser, more browsing); `1c` is a light-background single-task card (calmer, one decision). `1a` is the
middle position and the default recommendation.

### 6.2 Camera scan — new tab

State machine, three states: `idle → busy → done`.

- `idle`: framed viewfinder, corner marks, "BEREIT" status, light pill button "Scannen".
- `busy`: a 66px violet gradient bar sweeps top→bottom on a ~1.1s loop; status "ERKENNE WÖRTER…".
- `done`: harvest list, grouped by word type in this order — **Nomen** (`GENUS · PLURAL`),
  **Verben** (`KASUS · PRÄPOSITION`), **Adjektive** (`STEIGERUNG`). Every row is a checkbox, all pre-checked.
  Footer button reads "{n} Wörter ins Deck importieren" and switches to "{n} Wörter im Deck ✓" after import.

Filtering rule, per the brief: **only words strictly above the user's selected level** are shown. Words at or
below the level are counted in the status line but not listed. Match OCR tokens against `de_words.german`
after lemmatisation; unmatched tokens are dropped in v1 rather than guessed at.

Native pieces needed, none of which are in `package.json` yet: `expo-camera` for capture and
`expo-image-manipulator` for crop/resize. OCR: on-device via ML Kit text recognition (an Expo config plugin)
is the right target — it works offline and costs nothing per scan. A cloud OCR call is the fallback if the
plugin proves painful in EAS builds. Wire the recognised-word list through a `lib/ocr.ts` boundary so the
engine can be swapped without touching the screen.

Alternative UX in `1d`: instead of a list, the recognised words stay highlighted **in place on the page text**
and are tapped to select, with a detail sheet at the bottom. It is better for reading in context and worse
for bulk import. Worth building after the list version ships.

### 6.3 Dictionary entry — new tab

Search field; then the entry: article in its colour + serif headword, then a mono row of IPA, plural, level.
Then `Übersetzungen` as a two-column table (English left, domain label right, hairline between rows) —
this is the dict.cc-style density the brief asked for. Then `Beispiele`: exactly two sentences, German with
the headword in violet, English caption beneath. Then a violet "Ins Deck" pill (becomes gold + "Im Deck ✓ ·
nächste Wiederholung morgen" once added) with a 50px TTS button beside it — `expo-speech`, locale `de-DE`,
already a dependency. Then `Wortfamilie · im Kapitel` as outlined chips.

`Word` in `types/index.ts` already carries `article`, `pronunciation`, `synonyms`, `example_de/en`, and a
`forms: Record<string, unknown>`. Two fields the design needs and the type lacks: **plural** and a
**per-translation domain label**. Plural probably belongs inside `forms` (`forms.plural`); the domain label
means `english` has to become a small array of `{ text, domain }` rather than a string, which is a migration
on `de_words`. If that migration is not worth it now, render translations as a single-column list and drop
the domain column — the layout holds without it.

### 6.4 Deck review — new mode

Progress bar, "n von 12", session XP in gold. Card is `surface` with a `border` hairline, min 264px, tap
anywhere to reveal. Front: article + serif German. Back adds a hairline divider, English at 19px, grammar in
mono, then one example sentence. Footer hint switches from "TIPPEN ZUM UMDREHEN" to "WIE GUT HAST DU ES
GEWUSST?".

Grades and their labels, left to right: **Nochmal / 1 MIN** (red), **Schwer / 2 TAGE** (gold),
**Gut / 6 TAGE** (green), **Leicht / 18 TAGE** (violet). Those intervals are placeholder copy in the
prototype — they must be replaced with the real next-interval computed by `useSRS.ts` for *that* card, so the
button tells the truth. XP: 2 for Nochmal, 10 otherwise.

`useSRS.ts` does not exist. Write it to §5 of the architecture doc, but note that SM-2 lite as documented is
binary (got it / still learning) while this design is four-way. Either extend the algorithm to four grades
(easy multiplies the interval further, hard shortens it) or collapse the UI to two buttons. Extending is the
better call and is what the design assumes.

`1e` is a different card treatment entirely: a cloze sentence testing the adjective ending, with four
inflected options and a grammar explanation on answer. It tests case and gender rather than translation, and
suits B2+ better than the flip card. It is a second card *type*, not a replacement — the SRS scheduler can
serve either for the same word.

### 6.5 Progress — new tab

Streak card on a warm gradient: big gold streak number, then a seven-day row where filled days are gold and
today carries a gold outline. Level card: "Stufe 7 · n XP" with a violet→gold gradient bar and "340 BIS
STUFE 8". Then `Kapitel-Ringe` as a 2-column grid of `ProgressRing` + name + level. Then `Abzeichen` as a
104px-wide shelf, unearned badges at `textDim` with no fill.

`1f` replaces the rings with the more informative view: words-consolidated count, then one bar per CEFR level
A1→C2 using `levelA1`…`levelC2`, with a forecast line at the bottom ("Bei 15 Minuten am Tag erreichst du den
B2-Prüfungswortschatz Mitte Februar"). The forecast needs a real trailing-average calculation, not a guess.
Recommendation: ship `1f` as the Progress screen and keep the Kapitel rings on Home instead.

### 6.6 Tab bar — `app/(tabs)/_layout.tsx`

The design has five tabs: `HEUTE · SCAN · WÖRTER · DECK · PROFIL`. The repo has four:
`Home · Play · Phrases · Ranks`. Five is already at the comfortable limit, and this collides with Phrases
and Ranks, which the design does not account for. Resolve it before building — the cheapest resolution that
keeps everything: **Heute · Deck · Scan · Wörter · Profil**, with Phrases folded into the Wörter tab as a
segmented control (both are reference content) and Ranks moved inside Profil (it is progress).
Do not ship six tabs.

Labels: the brief asks for bilingual UI. The rule used in the design is **German first, English as a
secondary line** wherever there is room for two lines (screen titles, card labels, buttons), and
**German only** where there is not (tab labels, chips, badges, grammar metadata). Do not put slashes inside
a single label.

---

## 7. Content model

Themes are the **Goethe / telc / Klett exam themes**, not technical vocabulary — this changed late in the
design and matters for seeding. The set drawn in the prototype: Arbeit und Beruf, Wohnen und Umzug,
Gesundheit, Umwelt und Klima, Medien und Digitales, Bildung und Ausbildung, plus Reisen und Verkehr and
Feste und Traditionen mentioned in copy. `Word.category` is already a free-text field, so this is a
seed-data concern (`supabase/seeds/001_de_words.sql`), not a schema change — but the category strings need
normalising to one canonical list before the Themen shelf can group by them.

---

## 8. Accessibility

- 4.5:1 minimum for text; `textMuted` (`#9C968C`) is the floor and clears it at 4.9:1 on `bg`.
- Never set text with an alpha channel over the dark ground. The prototype originally did and it failed
  audit; that is why `textMuted` exists as a solid value.
- Violet-on-black at 14px is borderline. Violet is used as a **fill** with black text, or as an accent on
  large text — not as small text on the dark background. The one exception is the "NEU SCANNEN" action, which
  is set at `#A67FF0` and clears at 13px.
- Article colour is never the only signal — the article word itself is always spelled out.
- German text is long. Every label must wrap rather than truncate; "Kreislaufwirtschaft" and
  "Bildung und Ausbildung" are the stress tests.

---

## 9. Suggested sequence

1. `constants/Colors.ts` patch + `expo-font` + the three families. Nothing else changes; the app should look
   warmer and identical in structure.
2. `components/` primitives (§5) with `ProgressRing` on `react-native-svg`.
3. Home rework.
4. `hooks/useSRS.ts` extended to four grades, then the Deck screen.
5. Dictionary screen — decide the `english` domain-label migration first.
6. Progress screen (`1f` layout).
7. Camera scan last: it is the only item needing native modules, OCR, and a lemmatiser, and it depends on
   the deck existing to import into.

Steps 1–3 are worth shipping as one PR to see the palette in the real app before building new screens on it.
