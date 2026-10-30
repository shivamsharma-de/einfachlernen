import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '../withTimeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('withTimeout', () => {
  it('resolves with the value when the promise settles in time', async () => {
    vi.useFakeTimers();
    const p = withTimeout(Promise.resolve({ ok: true }), 1000);
    await expect(p).resolves.toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes through a rejection from the promise, not the timeout', async () => {
    vi.useFakeTimers();
    const p = withTimeout(Promise.reject(new Error('boom')), 1000);
    await expect(p).rejects.toThrow('boom');
  });

  it('rejects with "timeout" when the promise never settles', async () => {
    vi.useFakeTimers();
    const never = new Promise<number>(() => {});
    const p = withTimeout(never, 15_000);
    const assertion = expect(p).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it('does not time out before the limit', async () => {
    vi.useFakeTimers();
    let settled = false;
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 5000));
    const p = withTimeout(slow, 15_000).then((v) => { settled = true; return v; });
    await vi.advanceTimersByTimeAsync(4999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toBe('late');
  });
});
