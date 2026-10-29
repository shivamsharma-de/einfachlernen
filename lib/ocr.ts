import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';
import { localISODate } from './localdate';
import type { CEFRLevel } from '../types/index';

/** The scan boundary. The photo (or one typed word) goes to the server, which asks the model
 *  configured there (scan-words, _shared/vision.ts). No model is named on the device. */

export interface CatalogueHit {
  id: string;
  german: string;
  article: string | null;
  english: string;
  word_type: string;
  level: CEFRLevel;
  example_de: string | null;
  example_en: string | null;
  synonyms: string[];
}

/** A word the master dictionary lacks, with the model's meaning, example and synonyms. */
export interface Candidate {
  german: string;
  article: string | null;
  word_type: string;
  english: string;
  example_de: string;
  example_en: string;
  synonyms: string[];
  level: CEFRLevel;
  uncertain: boolean;
}

export interface ScanOutcome {
  scanId: string | null;
  catalogue: CatalogueHit[];
  candidates: Candidate[];
  alreadyYours: number;
  belowLevel: number;
  totalDetected: number;
}

export type ScanResult = { ok: true; data: ScanOutcome } | { ok: false; error: string };

interface ScanResponse {
  scan_id: string | null;
  catalogue: CatalogueHit[];
  candidates: Candidate[];
  already_yours: number;
  below_level: number;
  total_detected: number;
}

/** German messages for every code the server can return (scan-words/index.ts). */
const MESSAGES: Record<string, string> = {
  consent_required: 'Bitte stimme zuerst zu, dass Fotos zur Auswertung gesendet werden.',
  rate_limited: 'Zu viele Scans. Versuche es in einer Stunde erneut.',
  model_busy: 'Die Texterkennung ist gerade ausgelastet. Versuche es gleich noch einmal.',
  model_failed: 'Texterkennung fehlgeschlagen. Prüfe deine Verbindung.',
  model_unparseable: 'Texterkennung fehlgeschlagen. Versuche es noch einmal.',
  model_not_configured: 'Scannen ist noch nicht eingerichtet.',
  image_too_large: 'Das Bild ist zu groß. Versuche es noch einmal.',
  lookup_required: 'Gib ein Wort ein.',
  lookup_too_long: 'Das Wort ist zu lang.',
  invalid_token: 'Bitte melde dich erneut an.',
};

/** supabase-js hides the server's reason behind a generic message. The reason is in the body. */
async function codeOf(error: unknown): Promise<string> {
  const response = (error as { context?: Response }).context;
  try {
    const body = (await response?.json()) as { error?: string } | undefined;
    return body?.error ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Shrink a camera photo before upload: 1600px wide, JPEG 0.7, returned as base64. */
export async function preparePhoto(uri: string): Promise<string> {
  const out = await manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) throw new Error('Foto konnte nicht verarbeitet werden.');
  return out.base64;
}

async function call(body: Record<string, unknown>): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<ScanResponse>('scan-words', { body });
  if (error) {
    const code = await codeOf(error);
    return { ok: false, error: MESSAGES[code] ?? 'Das hat nicht geklappt. Versuche es noch einmal.' };
  }
  if (!data) return { ok: false, error: 'Keine Antwort vom Server.' };
  return {
    ok: true,
    data: {
      scanId: data.scan_id,
      catalogue: data.catalogue ?? [],
      candidates: data.candidates ?? [],
      alreadyYours: data.already_yours ?? 0,
      belowLevel: data.below_level ?? 0,
      totalDetected: data.total_detected ?? 0,
    },
  };
}

/** Reads a page photo. Words above `level` come back as candidates or catalogue hits. */
export function scanPhoto(imageBase64: string, level: CEFRLevel): Promise<ScanResult> {
  return call({ image_base64: imageBase64, level });
}

/** Looks up one typed word for "Wort hinzufügen". Always returns it as a candidate. */
export function lookupWord(word: string, level: CEFRLevel): Promise<ScanResult> {
  return call({ lookup: word, level });
}

/** Saves the chosen candidates to the learner's own dictionary and adds the chosen catalogue
 *  words to the deck. Safe to repeat: existing words are kept and their progress is not reset. */
export async function importScanWords(
  scanId: string | null,
  catalogueIds: string[],
  candidates: Candidate[],
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('import_scan_words', {
    p_scan_id: scanId,
    p_catalogue_ids: catalogueIds,
    p_words: candidates.map((c) => ({
      german: c.german,
      article: c.article,
      word_type: c.word_type,
      english: c.english,
      level: c.level,
      example_de: c.example_de,
      example_en: c.example_en,
      synonyms: c.synonyms,
      uncertain: c.uncertain,
      forms: {},
    })),
    p_local_day: localISODate(),
  });
  if (error) return { ok: false, error: 'Speichern fehlgeschlagen. Versuche es noch einmal.' };
  return { ok: true, imported: (data as { imported?: number } | null)?.imported ?? 0 };
}

/** Records (or withdraws) consent to send photos for word extraction. */
export async function setScanConsent(userId: string, granted: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ scan_consent_at: granted ? new Date().toISOString() : null })
    .eq('id', userId);
  if (error) return { ok: false, error: 'Einstellung konnte nicht gespeichert werden.' };
  return { ok: true };
}
