import { describe, expect, it } from 'vitest';
import { Outbox, backoffMs, type KeyValueStorage, type SendResult } from '../outbox';

/** In-memory stand-in for AsyncStorage. `store` lets a test simulate an app restart. */
function memoryStorage(store = new Map<string, string>()): KeyValueStorage {
  return {
    getItem: async (k) => store.get(k) ?? null,
    setItem: async (k, v) => {
      store.set(k, v);
    },
  };
}

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

const ok: SendResult = { ok: true };
const offline: SendResult = { ok: false, retryable: true, reason: 'network' };
const rejected: SendResult = { ok: false, retryable: false, reason: 'invalid_grade' };

describe('Outbox: durability', () => {
  it('a grade made offline survives an app restart', async () => {
    const store = new Map<string, string>();
    const first = new Outbox<{ w: string }>({ storage: memoryStorage(store), key: 'u1' });
    await first.enqueue('evt-1', { w: 'Haus' });

    // App killed and reopened: a brand-new Outbox over the same storage.
    const second = new Outbox<{ w: string }>({ storage: memoryStorage(store), key: 'u1' });
    expect(await second.size()).toBe(1);
    const sent: string[] = [];
    await second.flush(async (item) => {
      sent.push(item.payload.w);
      return ok;
    });
    expect(sent).toEqual(['Haus']);
    expect(await second.size()).toBe(0);
  });

  it('an item is removed only after the server acknowledges it', async () => {
    const outbox = new Outbox<string>({ storage: memoryStorage(), key: 'u1', now: clock().now });
    await outbox.enqueue('evt-1', 'a');
    await outbox.flush(async () => offline);
    expect(await outbox.size()).toBe(1);
  });

  it('the same event id enqueued twice is stored once', async () => {
    const outbox = new Outbox<string>({ storage: memoryStorage(), key: 'u1' });
    await outbox.enqueue('evt-1', 'a');
    await outbox.enqueue('evt-1', 'a');
    expect(await outbox.size()).toBe(1);
  });

  it('a corrupt stored queue starts clean instead of blocking the app', async () => {
    const store = new Map<string, string>([['u1', '{not json']]);
    const outbox = new Outbox<string>({ storage: memoryStorage(store), key: 'u1' });
    expect(await outbox.read()).toEqual([]);
    await outbox.enqueue('evt-1', 'a');
    expect(await outbox.size()).toBe(1);
  });
});

describe('Outbox: ordering and retries', () => {
  it('sends in creation order', async () => {
    const c = clock();
    const outbox = new Outbox<number>({ storage: memoryStorage(), key: 'u1', now: c.now });
    for (let i = 1; i <= 3; i++) {
      await outbox.enqueue(`evt-${i}`, i);
      c.advance(1);
    }
    const order: number[] = [];
    await outbox.flush(async (item) => {
      order.push(item.payload);
      return ok;
    });
    expect(order).toEqual([1, 2, 3]);
  });

  it('stops at the first retryable failure and does not hammer the network', async () => {
    const outbox = new Outbox<number>({ storage: memoryStorage(), key: 'u1', now: clock().now });
    for (let i = 1; i <= 3; i++) await outbox.enqueue(`evt-${i}`, i);
    let calls = 0;
    const report = await outbox.flush(async () => {
      calls++;
      return offline;
    });
    expect(calls).toBe(1);
    expect(report.pending).toBe(1);
    expect(await outbox.size()).toBe(3);
  });

  it('does not retry an item before its backoff has elapsed', async () => {
    const c = clock();
    const outbox = new Outbox<number>({ storage: memoryStorage(), key: 'u1', now: c.now });
    await outbox.enqueue('evt-1', 1);
    await outbox.flush(async () => offline);

    let calls = 0;
    await outbox.flush(async () => {
      calls++;
      return ok;
    });
    expect(calls).toBe(0);

    c.advance(backoffMs(1, 300_000));
    await outbox.flush(async () => {
      calls++;
      return ok;
    });
    expect(calls).toBe(1);
  });

  it('a retried item is sent exactly once when the connection returns', async () => {
    const c = clock();
    const outbox = new Outbox<number>({ storage: memoryStorage(), key: 'u1', now: c.now });
    await outbox.enqueue('evt-1', 1);
    // Server processed it, but the response was lost: client sees a failure.
    await outbox.flush(async () => offline);
    c.advance(10 * 60_000);
    const seen: string[] = [];
    await outbox.flush(async (item) => {
      seen.push(item.id);
      return ok;
    });
    expect(seen).toEqual(['evt-1']); // one send from the client's point of view
    expect(await outbox.size()).toBe(0);
  });

  it('a permanent rejection is dropped and reported, not retried forever', async () => {
    const outbox = new Outbox<number>({ storage: memoryStorage(), key: 'u1', now: clock().now });
    await outbox.enqueue('evt-bad', 9);
    await outbox.enqueue('evt-good', 1);
    const report = await outbox.flush(async (item) => (item.id === 'evt-bad' ? rejected : ok));
    expect(report.dropped).toEqual([{ id: 'evt-bad', reason: 'invalid_grade' }]);
    expect(report.sent).toBe(1);
    expect(await outbox.size()).toBe(0);
  });

  it('a thrown error counts as retryable, never as a silent loss', async () => {
    const outbox = new Outbox<number>({ storage: memoryStorage(), key: 'u1', now: clock().now });
    await outbox.enqueue('evt-1', 1);
    await outbox.flush(async () => {
      throw new Error('fetch failed');
    });
    expect(await outbox.size()).toBe(1);
  });

  it('flags items stuck after repeated failures', async () => {
    const c = clock();
    const outbox = new Outbox<number>({
      storage: memoryStorage(), key: 'u1', now: c.now, reportAfterAttempts: 2,
    });
    await outbox.enqueue('evt-1', 1);
    await outbox.flush(async () => offline);
    c.advance(10 * 60_000);
    const report = await outbox.flush(async () => offline);
    expect(report.stuck).toBe(1);
  });

  it('concurrent flushes share one run, so nothing is sent twice', async () => {
    const outbox = new Outbox<number>({ storage: memoryStorage(), key: 'u1', now: clock().now });
    await outbox.enqueue('evt-1', 1);
    let calls = 0;
    const send = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return ok;
    };
    await Promise.all([outbox.flush(send), outbox.flush(send)]);
    expect(calls).toBe(1);
  });
});

describe('backoffMs', () => {
  it('doubles from 2s and respects the cap', () => {
    expect(backoffMs(1, 300_000)).toBe(2_000);
    expect(backoffMs(2, 300_000)).toBe(4_000);
    expect(backoffMs(3, 300_000)).toBe(8_000);
    expect(backoffMs(30, 300_000)).toBe(300_000);
  });
});
