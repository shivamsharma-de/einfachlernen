import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { localISODate } from './localdate';
import { Outbox, type SendResult } from './outbox';
import { withTimeout } from './withTimeout';
import type { CEFRLevel } from '../types';
import type { Result } from '../types/contracts';

/** The vocabulary test (plan §3). The server builds and scores every question. The app
 *  only shows them. Answers are sent straight away; any that fail to send are kept on the
 *  device and retried, so nothing answered is lost. */

export type TestQuestion = {
  item_id: string;
  position: number;
  word_id: string;
  german: string;
  article: 'der' | 'die' | 'das' | null;
  word_type: string;
  level: CEFRLevel;
  options: string[];
  correct_index: number;
};

export type TestStart = {
  attempt_id: string;
  mode: 'studied' | 'first_look';
  total: number;
  /** How many of the questions come from words the learner has studied (migration 021). */
  studied?: number;
  questions: TestQuestion[];
};

export type Light = 'grey' | 'red' | 'yellow' | 'green';
export type LightCounts = Record<Light, number> & { studied: number };

export type AnswerResult = { correct: boolean; correct_index: number; xp: number; already_answered: boolean };

type Pending =
  | { kind: 'answer'; itemId: string; chosen: number; localDay: string }
  | { kind: 'finish'; attemptId: string };

const outboxes = new Map<string, Outbox<Pending>>();

function outboxFor(userId: string): Outbox<Pending> {
  let box = outboxes.get(userId);
  if (!box) {
    box = new Outbox<Pending>({ storage: AsyncStorage, key: `test_outbox:${userId}` });
    outboxes.set(userId, box);
  }
  return box;
}

const germanError = (msg: string) =>
  /fetch|network|timeout/i.test(msg) ? 'Keine Verbindung. Bitte später erneut versuchen.' : 'Der Test konnte nicht geladen werden.';

/** The server builds a round in one call. Past this, the screen shows an error instead of spinning forever. */
const START_TIMEOUT_MS = 15_000;

export async function startTest(levels: CEFRLevel[], count = 10): Promise<Result<TestStart>> {
  let response;
  try {
    response = await withTimeout(
      supabase.rpc('start_test', { p_levels: levels, p_count: count, p_local_day: localISODate() }),
      START_TIMEOUT_MS,
    );
  } catch (e) {
    return { ok: false, error: germanError(e instanceof Error ? e.message : String(e)) };
  }
  const { data, error } = response;
  if (error) {
    if (/not_enough_material/.test(error.message)) {
      return { ok: false, error: 'Noch nicht genug Wörter für einen Test. Lerne zuerst ein paar Karten.' };
    }
    return { ok: false, error: germanError(error.message) };
  }
  return { ok: true, data: data as TestStart };
}

/** Sends one answer. Returns the server's verdict, or null if it could not be sent yet. */
export async function submitAnswer(
  userId: string,
  itemId: string,
  chosen: number,
): Promise<AnswerResult | null> {
  const localDay = localISODate();
  const { data, error } = await supabase.rpc('submit_answer', {
    p_item_id: itemId,
    p_chosen: chosen,
    p_local_day: localDay,
  });
  if (!error && data) return data as AnswerResult;

  // Could not reach the server: keep the answer and send it later.
  await outboxFor(userId).enqueue(itemId, { kind: 'answer', itemId, chosen, localDay });
  return null;
}

export async function finishTest(userId: string, attemptId: string): Promise<Result<{ correct: number; total: number; perfect_bonus: boolean }>> {
  const { data, error } = await supabase.rpc('finish_test', { p_attempt_id: attemptId });
  if (error) {
    await outboxFor(userId).enqueue(`finish:${attemptId}`, { kind: 'finish', attemptId });
    return { ok: false, error: germanError(error.message) };
  }
  const d = data as { correct: number; total: number; perfect_bonus: boolean };
  return { ok: true, data: { correct: d.correct, total: d.total, perfect_bonus: d.perfect_bonus } };
}

/** Sends everything waiting on the device. Safe to call often. */
export async function flushTest(userId: string): Promise<void> {
  await outboxFor(userId).flush(async (item): Promise<SendResult> => {
    const p = item.payload;
    const { error } = p.kind === 'answer'
      ? await supabase.rpc('submit_answer', { p_item_id: p.itemId, p_chosen: p.chosen, p_local_day: p.localDay })
      : await supabase.rpc('finish_test', { p_attempt_id: p.attemptId });
    if (!error) return { ok: true };
    return /^(22|23|42|P0)/.test(error.code ?? '')
      ? { ok: false, retryable: false, reason: error.code ?? 'rejected' }
      : { ok: false, retryable: true, reason: error.message };
  });
}

/** Counts of studied words by traffic light, for the Heute bar. */
export async function fetchLights(levels: CEFRLevel[]): Promise<Result<LightCounts>> {
  const { data, error } = await supabase.rpc('word_lights', { p_levels: levels });
  if (error) return { ok: false, error: germanError(error.message) };
  const counts: LightCounts = { grey: 0, red: 0, yellow: 0, green: 0, studied: 0 };
  for (const row of (data ?? []) as { light: Light }[]) {
    counts[row.light] += 1;
    counts.studied += 1;
  }
  return { ok: true, data: counts };
}
