/**
 * Calendar dates in the learner's own timezone.
 *
 * `toISOString().slice(0, 10)` returns the UTC date. For a learner in Berlin that
 * is one day behind between midnight and 01:00–02:00 local time, so "today" is
 * wrong for the first hours of every day: the deck offers yesterday's session
 * and the streak resets early. Every "what day is it" decision goes through
 * here so the answer is always the device's calendar date.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD for the device's local calendar date. */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local date `days` after `from`, as YYYY-MM-DD. Negative values go back. */
export function addDaysLocal(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return localISODate(d);
}
