import { supabase } from './supabase';
import { CEFRLevel, Word } from '../types';

/** The OCR boundary design-spec.md §6.2 asked for: one function that takes an
 *  image and returns recognised words, so the engine can be swapped without the
 *  scan screen changing.
 *
 *  Current engine: Claude vision behind the `scan-words` Edge Function (PRD v2
 *  D4). On-device ML Kit was the original plan but does not run in Expo Go; to
 *  switch back, reimplement `scanImage` and leave the signature alone. */

export interface ScanOutcome {
  scanId: string | null;
  /** Words matched in the catalogue AND strictly above the user's level. */
  words: Word[];
  /** Every German word the engine could see, including ones not listed. */
  totalDetected: number;
  /** Matched but at or below the user's level — counted, not listed (§6.2). */
  atOrBelowLevel: number;
  /** Recognised but absent from `de_words`. Dropped, never guessed at. */
  unmatched: number;
}

export type ScanResult =
  | { ok: true; data: ScanOutcome }
  | { ok: false; error: string };

interface ScanResponse {
  scan_id: string | null;
  words: Word[];
  total_detected: number;
  matched_count: number;
  at_or_below_level: number;
  unmatched: number;
}

/** Human-readable reasons for the failures the screen can actually hit. */
const MESSAGES: Record<string, string> = {
  rate_limited: 'Zu viele Scans. Versuche es in einer Stunde erneut.',
  image_too_large: 'Das Bild ist zu groß. Versuche es noch einmal.',
  vision_failed: 'Texterkennung fehlgeschlagen. Prüfe deine Verbindung.',
  vision_unparseable: 'Texterkennung fehlgeschlagen. Versuche es noch einmal.',
  anthropic_key_missing: 'Scannen ist noch nicht eingerichtet.',
};

export async function scanImage(imageBase64: string, level: CEFRLevel): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<ScanResponse>('scan-words', {
    body: { image_base64: imageBase64, level },
  });

  if (error) return { ok: false, error: MESSAGES[error.message] ?? error.message };
  if (!data) return { ok: false, error: 'Keine Antwort vom Server.' };

  return {
    ok: true,
    data: {
      scanId: data.scan_id,
      words: data.words ?? [],
      totalDetected: data.total_detected ?? 0,
      atOrBelowLevel: data.at_or_below_level ?? 0,
      unmatched: data.unmatched ?? 0,
    },
  };
}
