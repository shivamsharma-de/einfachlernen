/** Short word-building tips shown while a page is being read. Fixed text, no model call. */
export const SCAN_TIPS: string[] = [
  'Zusammengesetzte Wörter: Haus + Tür = Haustür. Das Genus richtet sich nach dem letzten Wort: die Haustür.',
  'Viele Nomen entstehen aus Verben: lösen → die Lösung. Die Endung -ung ist fast immer feminin.',
  'Trennbare Verben: ankommen → ich komme an. Die Vorsilbe wandert ans Satzende.',
  'Vorsilben verändern die Bedeutung eines Verbs: be-, ent-, er-, ver-, zer- kommen bei vielen Verben vor. Lerne Verb und Vorsilbe zusammen.',
  'Lange Wörter sind oft kurze Bausteine: Krankenhaus = Kranken + Haus.',
  'Nomen lernst du am besten mit Artikel: der, die oder das. Das Genus gehört zum Wort.',
  'Adjektive mit -lich oder -ig beschreiben Eigenschaften: freundlich, wichtig.',
];

/** The tip for a given step, so the tips rotate without repeating in a row. */
export function tipAt(step: number): string {
  return SCAN_TIPS[((step % SCAN_TIPS.length) + SCAN_TIPS.length) % SCAN_TIPS.length];
}

/** The progress estimate. The server gives no progress, so this is a time-based curve that
 *  never reaches 100% on its own: the bar only completes when the answer arrives. */
export function estimatedProgress(elapsedSeconds: number): number {
  return 0.95 * (1 - Math.exp(-elapsedSeconds / 9));
}

/** The label for the current estimate. Stages are approximate, not measured. */
export function stageLabel(progress: number): string {
  if (progress < 0.12) return 'Foto wird vorbereitet';
  if (progress < 0.3) return 'Foto wird an die Texterkennung gesendet';
  if (progress < 0.8) return 'Wörter werden erkannt';
  return 'Bedeutungen und Beispiele werden geschrieben';
}
