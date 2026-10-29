# swypo — brand assets

Chosen logo: **2a, card stack**. Violet = `#b688fe` (`Colors.purple` in tokens.ts is the same colour, #A67FF0, rounded).

| File | Use |
|---|---|
| `swypo-icon.svg` | App icon, splash, ≥48px. Back card outline + tilted violet card with serif "s". |
| `swypo-icon-small.svg` | ≤40px (notification, favicon). Drops the back card — it turns to noise at small sizes. |
| `pictograms/*.svg` | 22 theme pictograms, `currentColor` stroke, 24 grid. |
| `themes.ts` | Same pictograms as XML strings + id, CEFR band, DE/EN name, tile bg/fg hex. |

**Wordmark:** "swypo" set in Instrument Serif 400, lowercase, followed by a period in violet
(`swypo.`). On light grounds the period darkens to `#864ad2`. Letter-spacing -0.01em.
No separate wordmark file: set it as text with the loaded font.

**The "s" in the icon is live text.** It renders correctly only where Instrument Serif is installed.
Before generating PNGs, convert it to outlines (Figma: select text → Outline stroke / Flatten; or
Inkscape: Path → Object to Path), then export.

**Theme tiles:** 150×150, radius 12, `bg` fill, CEFR band top-left in IBM Plex Mono 9.5 uppercase in `fg`,
pictogram 78px bottom-right inset 10, stroke 1.4 in `fg`. Name below in Plex Sans 600 13.5, English
caption 11.5 in textMuted.
