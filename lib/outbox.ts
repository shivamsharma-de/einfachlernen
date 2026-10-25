/**
 * Durable outbox for grades.
 *
 * A grade is the one write the app cannot afford to lose: it is the learner's
 * work, and it decides when the card comes back. The previous path sent each
 * grade once and, on failure, logged a warning and moved on, so a grade made
 * on a train with no signal simply vanished.
 *
 * Now a grade is written to AsyncStorage first, then sent. Anything not yet
 * acknowledged stays in the queue and is retried when the app comes back to the
 * foreground, when the session is restored, or when a fresh grade is added.
 *
 * Idempotency: every item carries a client-generated event id. The server stores
 * it as the primary key of `review_log`, so a retry after a lost response is a
 * harmless duplicate, never a double count.
 *
 * Storage is injected, so the queue logic is testable without a device.
 */

export type OutboxItem<T = unknown> = {
  /** Client-generated, stable across retries. The server's idempotency key. */
  id: string;
  payload: T;
  /** Failed attempts so far. Drives the backoff. */
  attempts: number;
  /** Earliest epoch-ms the next attempt may run. */
  nextAttemptAt: number;
  createdAt: number;
};

export type SendResult =
  /** Accepted by the server, or a duplicate of something it already has. */
  | { ok: true }
  /** Transient: offline, timeout, 5xx, 429. Keep the item and retry later. */
  | { ok: false; retryable: true; reason: string }
  /** Permanent: the server rejected the content. Drop it and report it. */
  | { ok: false; retryable: false; reason: string };

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type OutboxOptions = {
  storage: KeyValueStorage;
  /** Storage key. Scoped per user so one account never sends another's grades. */
  key: string;
  now?: () => number;
  /** Cap on the backoff, so a long outage still retries about every few minutes. */
  maxBackoffMs?: number;
  /** After this many failures a retryable item is kept but reported. */
  reportAfterAttempts?: number;
};

const BASE_BACKOFF_MS = 2_000;

export function backoffMs(attempts: number, cap: number): number {
  // 2s, 4s, 8s … capped. attempts=1 is the first retry.
  return Math.min(cap, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

export class Outbox<T> {
  private readonly storage: KeyValueStorage;
  private readonly key: string;
  private readonly now: () => number;
  private readonly maxBackoffMs: number;
  private readonly reportAfterAttempts: number;
  private flushing: Promise<FlushReport> | null = null;

  constructor(opts: OutboxOptions) {
    this.storage = opts.storage;
    this.key = opts.key;
    this.now = opts.now ?? Date.now;
    this.maxBackoffMs = opts.maxBackoffMs ?? 5 * 60_000;
    this.reportAfterAttempts = opts.reportAfterAttempts ?? 5;
  }

  async read(): Promise<OutboxItem<T>[]> {
    try {
      const raw = await this.storage.getItem(this.key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as OutboxItem<T>[]) : [];
    } catch {
      // A corrupt queue must never block the app. Start clean; the server copy
      // of already-acknowledged grades is unaffected.
      return [];
    }
  }

  private async write(items: OutboxItem<T>[]): Promise<void> {
    await this.storage.setItem(this.key, JSON.stringify(items));
  }

  /** Persist a new item before anything is sent. Returns once it is durable. */
  async enqueue(id: string, payload: T): Promise<void> {
    const items = await this.read();
    // Same id twice means the same event: keep the first, do not duplicate.
    if (items.some((i) => i.id === id)) return;
    items.push({ id, payload, attempts: 0, nextAttemptAt: this.now(), createdAt: this.now() });
    await this.write(items);
  }

  /**
   * Send everything that is due, in creation order. Items are removed only after
   * the server acknowledges them, so a crash mid-flush re-sends rather than loses.
   * Concurrent calls share one flush.
   */
  flush(send: (item: OutboxItem<T>) => Promise<SendResult>): Promise<FlushReport> {
    if (this.flushing) return this.flushing;
    this.flushing = this.runFlush(send).finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async runFlush(send: (item: OutboxItem<T>) => Promise<SendResult>): Promise<FlushReport> {
    const report: FlushReport = { sent: 0, dropped: [], pending: 0, stuck: 0 };
    let items = await this.read();

    for (const item of [...items].sort((a, b) => a.createdAt - b.createdAt)) {
      if (item.nextAttemptAt > this.now()) {
        report.pending++;
        continue;
      }

      const result = await send(item).catch(
        (err): SendResult => ({ ok: false, retryable: true, reason: String(err?.message ?? err) }),
      );

      if (result.ok) {
        items = items.filter((i) => i.id !== item.id);
        report.sent++;
        await this.write(items);
        continue;
      }

      if (!result.retryable) {
        items = items.filter((i) => i.id !== item.id);
        report.dropped.push({ id: item.id, reason: result.reason });
        await this.write(items);
        continue;
      }

      const attempts = item.attempts + 1;
      items = items.map((i) =>
        i.id === item.id
          ? { ...i, attempts, nextAttemptAt: this.now() + backoffMs(attempts, this.maxBackoffMs) }
          : i,
      );
      if (attempts >= this.reportAfterAttempts) report.stuck++;
      report.pending++;
      await this.write(items);
      // Connectivity is the usual cause, so the rest will fail the same way.
      // Stop here and try again later rather than hammering the network.
      break;
    }

    return report;
  }

  async size(): Promise<number> {
    return (await this.read()).length;
  }
}

export type FlushReport = {
  sent: number;
  /** Permanently rejected items, removed from the queue and surfaced for logging. */
  dropped: { id: string; reason: string }[];
  /** Items still waiting for a retry. */
  pending: number;
  /** Retryable items that have failed often enough to warrant attention. */
  stuck: number;
};
