/** The on-device gate that runs before a scanned photo is sent anywhere.
 *
 *  Strict allowlist: a photo passes only when it is clearly a page of text. Everything else is
 *  blocked, including skin, people, and images without text. The native measurements come from
 *  two on-device models: a text detector (how much of the frame is text) and an explicit-content
 *  classifier (GantMan's nsfw_model, MobileNetV2, TFLite). This file holds only the decision,
 *  so the thresholds can be tuned and tested without a device.
 *
 *  Fail-closed: a missing or failed measurement blocks the photo. Nothing is sent by default. */

export interface NsfwScores {
  drawing: number;
  hentai: number;
  neutral: number;
  porn: number;
  sexy: number;
}

export interface PageMeasurement {
  /** Share of the frame covered by recognised text boxes, 0–1. */
  textCoverage: number;
  /** Words the text detector recognised. */
  wordCount: number;
  /** Share of the frame covered by people or faces, 0–1. */
  humanCoverage: number;
  /** Explicit-content classifier scores, each 0–1. null when the classifier did not run. */
  nsfw: NsfwScores | null;
}

export type BlockReason =
  | 'unavailable'      // a measurement is missing: fail closed
  | 'explicit'         // the classifier flags explicit content
  | 'people'           // people or faces fill too much of the frame
  | 'no_text';         // not enough text to be a page

export type GateDecision = { allow: true } | { allow: false; reason: BlockReason };

/** Thresholds. Start here, then tune on real pages (books, handwritten notes, screens). */
export const GATE_THRESHOLDS = {
  /** A dense page: text covers a fifth of the frame, with a few words. */
  minTextCoverage: 0.2,
  minWords: 15,
  /** A sparse page, such as a vocabulary table in large type: little coverage, but many words. */
  minSparseTextCoverage: 0.05,
  minSparseWords: 30,
  maxHumanCoverage: 0.02,
  /** Explicit classes summed: porn + hentai + sexy. */
  maxExplicitScore: 0.3,
} as const;

/** The German message shown for each block reason. */
export const GATE_MESSAGES: Record<BlockReason, string> = {
  unavailable: 'Dieses Foto konnte nicht geprüft werden. Bitte versuche es noch einmal.',
  explicit: 'Dieses Foto kann nicht verwendet werden. Fotografiere bitte nur Text, zum Beispiel eine Buchseite.',
  people: 'Auf dem Foto sind Personen zu sehen. Fotografiere bitte nur eine Textseite.',
  no_text: 'Auf dem Foto ist zu wenig Text zu sehen. Halte die Seite ganz ins Bild.',
};

export function decidePage(m: PageMeasurement | null): GateDecision {
  // Fail closed: a missing or incomplete measurement never passes.
  if (!m || m.nsfw === null || !Number.isFinite(m.textCoverage) || !Number.isFinite(m.humanCoverage)) {
    return { allow: false, reason: 'unavailable' };
  }

  const explicit = m.nsfw.porn + m.nsfw.hentai + m.nsfw.sexy;
  if (explicit >= GATE_THRESHOLDS.maxExplicitScore) return { allow: false, reason: 'explicit' };

  if (m.humanCoverage > GATE_THRESHOLDS.maxHumanCoverage) return { allow: false, reason: 'people' };

  const dense = m.textCoverage >= GATE_THRESHOLDS.minTextCoverage && m.wordCount >= GATE_THRESHOLDS.minWords;
  const sparse = m.textCoverage >= GATE_THRESHOLDS.minSparseTextCoverage && m.wordCount >= GATE_THRESHOLDS.minSparseWords;
  if (!dense && !sparse) return { allow: false, reason: 'no_text' };

  return { allow: true };
}
