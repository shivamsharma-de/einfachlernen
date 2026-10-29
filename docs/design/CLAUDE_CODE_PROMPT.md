# What to tell Claude Code

Two prompts. Run the first one on its own and look at the app before running the second — the palette
change touches every screen, and you want to see it land before new screens are built on top of it.

Both assume you are in the `einfachlernen` repo and that `handoff/design-spec.md` and `handoff/tokens.ts`
from this project have been copied into the repo (put them in `docs/design/`).

---

## Prompt 1 — palette, type, primitives, Home

> I have a design handoff in `docs/design/design-spec.md` with tokens in `docs/design/tokens.ts`.
> Read both fully before writing any code, then implement steps 1–3 of §9 only.
>
> 1. Replace `constants/Colors.ts` with the tokens file, keeping every existing key name so nothing else
>    breaks. Then grep the whole repo for hardcoded hex values and `rgba(` literals in StyleSheets and
>    replace them with `Colors.*` references — `app/(tabs)/quiz.tsx` and `leaderboard.tsx` are the likely
>    offenders. Do not change any layout while doing this.
> 2. Add `expo-font` and load Instrument Serif, IBM Plex Sans (400/500/600) and IBM Plex Mono (500) from
>    `assets/fonts/`. Block render until fonts are loaded in `app/_layout.tsx`.
> 3. Create `components/` and build the primitives listed in §5. Use `react-native-svg` for
>    `ProgressRing` — do not attempt the conic gradient from the web prototype.
> 4. Rework `app/(tabs)/index.tsx` to the Home spec in §6.1, in that exact block order. Use the existing
>    `fetchWordsByLevel` and `fetchWordCountsByLevel` from `lib/db.ts`. Where the design needs data that
>    does not exist yet — minutes studied today, per-Kapitel progress — add it to the local progress shape
>    and return zeroes rather than faking values.
>
> Constraints: TypeScript strict, no new dependencies beyond `expo-font` and `react-native-svg`, every tap
> target ≥44pt, no text set with an alpha channel, and `textDim` must never be used on text. Run
> `tsc --noEmit` before you finish.
>
> Do not touch `quiz.tsx`, `phrases.tsx` or `leaderboard.tsx` beyond the colour-reference cleanup, and do
> not start the deck, dictionary, progress or scan screens.

---

## Prompt 2 — the new screens

> Continuing from `docs/design/design-spec.md`. Implement §6.4, §6.3 and §6.5 in that order, one commit each.
>
> - **Deck (§6.4):** first write `hooks/useSRS.ts`. The architecture doc §5 describes a two-outcome SM-2
>   lite; extend it to the four grades in the design (again/hard/good/easy) and persist review state to
>   AsyncStorage under the existing local-progress key. The interval label on each grade button must be the
>   real computed next interval for the card on screen, not a fixed string.
> - **Dictionary (§6.3):** before building, tell me whether you recommend migrating `de_words.english` from
>   a string to `{text, domain}[]` for the domain column, or rendering translations as a single column for
>   now. Wait for my answer on that one question, then build. `forms.plural` is where plural goes. TTS uses
>   `expo-speech` with locale `de-DE`.
> - **Progress (§6.5):** build the `1f` layout — per-CEFR-level word bars using the `levelA1`…`levelC2`
>   colours — not the ring grid. The forecast line must come from a real trailing-average of the last 14
>   days; if there is not enough history, hide the line rather than estimating.
>
> Then resolve the tab bar per §6.6: five tabs, Phrases folded into the Wörter tab as a segmented control
> and Ranks moved inside Profil. Also move `_screens_auth/` into `app/` so onboarding and auth actually
> mount — that folder is currently outside the router.
>
> Same constraints as before. `tsc --noEmit` clean before you finish.

---

## Prompt 3 — camera scan, later

Only run this once the deck exists, since the scan imports into it.

> Implement §6.2, the camera scan. Add `expo-camera` and `expo-image-manipulator`. Put OCR behind a
> `lib/ocr.ts` interface with one function that takes an image URI and returns string tokens, so the engine
> can be swapped; implement it with on-device ML Kit text recognition via an Expo config plugin, and verify
> it survives an EAS development build before building the UI on top of it.
>
> Match tokens against `de_words.german` after lemmatisation. Show only words strictly above the user's
> selected CEFR level; count the rest in the status line but do not list them. Group results as Nomen /
> Verben / Adjektive with the metadata labels in the spec. Drop unmatched tokens — do not guess translations.
>
> Build the list version from §6.2 first. The in-place tap-on-page variant (`1d`) is a follow-up.

---

## Open decisions Claude Code cannot make for you

Answer these before or during the runs above; the spec flags each one:

1. **Tab bar.** Five design tabs collide with the existing Phrases and Ranks. §6.6 recommends folding
   Phrases into Wörter and Ranks into Profil. Confirm or choose differently.
2. **Home layout.** `1a` (recommended), `1b` shelves, or `1c` single-task card.
3. **Translation domain labels.** Worth a `de_words` migration, or single-column for now?
4. **SRS grades.** Four buttons (design assumes this, needs the algorithm extended) or two (matches the
   architecture doc as written)?
5. **Category strings.** The seed data needs normalising to the eight canonical Themen in `tokens.ts`
   before the Themen shelf can group correctly. Who does that — a SQL migration or a one-off script?
6. **OCR engine.** On-device ML Kit (offline, free per scan, config-plugin risk) vs cloud OCR (simpler,
   per-call cost, needs connectivity).
