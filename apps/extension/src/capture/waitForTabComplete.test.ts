import { describe, expect, it, vi } from 'vitest';
import { waitForTabComplete } from './waitForTabComplete.js';

describe('waitForTabComplete', () => {
  it('resolves when getTab reports complete and removes listener', async () => {
    const removeUpdatedListener = vi.fn();
    const addUpdatedListener = vi.fn();
    await waitForTabComplete(7, {
      addUpdatedListener,
      removeUpdatedListener,
      getTab: vi.fn(async () => ({ status: 'complete' })),
      timeoutMs: 1000,
    });
    expect(addUpdatedListener).toHaveBeenCalledOnce();
    expect(removeUpdatedListener).toHaveBeenCalledOnce();
  });

  it('resolves from onUpdated complete', async () => {
    const removeUpdatedListener = vi.fn();
    let listener: ((tabId: number, info: { status?: string }) => void) | undefined;
    const promise = waitForTabComplete(3, {
      addUpdatedListener: (fn) => {
        listener = fn;
      },
      removeUpdatedListener,
      getTab: vi.fn(async () => ({ status: 'loading' })),
      timeoutMs: 1000,
    });
    listener?.(3, { status: 'complete' });
    await promise;
    expect(removeUpdatedListener).toHaveBeenCalledOnce();
  });

  it('removes listener immediately when getTab rejects (no 30s hang)', async () => {
    const removeUpdatedListener = vi.fn();
    const promise = waitForTabComplete(9, {
      addUpdatedListener: vi.fn(),
      removeUpdatedListener,
      getTab: vi.fn(async () => {
        throw new Error('No tab with id: 9');
      }),
      timeoutMs: 30_000,
    });
    await expect(promise).rejects.toThrow(/No tab with id: 9/);
    expect(removeUpdatedListener).toHaveBeenCalledOnce();
  });

  it('times out and cleans up listener', async () => {
    const removeUpdatedListener = vi.fn();
    await expect(
      waitForTabComplete(1, {
        addUpdatedListener: vi.fn(),
        removeUpdatedListener,
        getTab: vi.fn(async () => ({ status: 'loading' })),
        timeoutMs: 20,
      }),
    ).rejects.toThrow(/timed out/);
    expect(removeUpdatedListener).toHaveBeenCalledOnce();
  });
});
