/** Level from total XP. Progress itself lives on the server (migration 015): nothing
 *  about a learner's progress is stored on the device. */

export const XP_PER_STUFE = 500;

export function stufe(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_STUFE) + 1;
}
