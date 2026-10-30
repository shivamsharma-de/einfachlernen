/** Due-word selection restricted to the learner's selected levels (BUG-004).
 *  Pure TS, so it is unit tested in lib/__tests__/dueLevels.test.ts. */

/** `word_progress` has no level column, so the level is read from the word itself. A due
 *  word from an unselected level (say A1 when the learner now studies B1) is dropped. */
export function dueIdsInLevels<T extends { id: string; level: string }>(
  orderedIds: readonly string[],
  words: ReadonlyMap<string, T>,
  levels: readonly string[],
  limit: number,
): string[] {
  const allowed = new Set(levels);
  const out: string[] = [];
  for (const id of orderedIds) {
    if (out.length >= limit) break;
    const w = words.get(id);
    if (w && allowed.has(w.level)) out.push(id);
  }
  return out;
}

/** Splits ids into chunks so `.in('id', …)` stays within a sane URL length. */
export function chunkIds(ids: readonly string[], size = 100): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
