/** How new cards are added to a session. Due cards are counted first and are never displaced.
 *  Central new words fill first, up to the learner's daily allowance. Personal words (the
 *  learner's own scan imports) take what room is left, and the server has already applied
 *  their own daily cap. Both lists come in frequency or recency order and are kept that way. */
export function takeNewCards<T>(room: number, central: T[], personal: T[]): T[] {
  const cap = Math.max(0, room);
  const first = central.slice(0, cap);
  return [...first, ...personal.slice(0, Math.max(0, cap - first.length))];
}
