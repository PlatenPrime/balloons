import { describe, expect, it, vi } from 'vitest';
import {
  dispatchSwMessage,
  handleCapture,
  handleTokenSync,
  type BackgroundHandlerDeps,
} from './backgroundHandlers.js';
import { STORAGE_KEYS } from './shared/storage.js';

function createMemoryStorage(initial: Record<string, unknown> = {}) {
  const store = { ...initial };
  return {
    store,
    get: async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      const out: Record<string, unknown> = {};
      for (const key of list) {
        if (key in store) out[key] = store[key];
      }
      return out;
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    },
  };
}

describe('backgroundHandlers', () => {
  it('handleTokenSync stores token and clears lastError', async () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.lastError]: 'old' });
    const deps: BackgroundHandlerDeps = { storage };
    await expect(handleTokenSync(deps, 'jwt', 'http://localhost:3000')).resolves.toEqual({
      ok: true,
    });
    expect(storage.store[STORAGE_KEYS.token]).toBe('jwt');
    expect(storage.store[STORAGE_KEYS.apiBaseUrl]).toBe('http://localhost:3000');
    expect(storage.store[STORAGE_KEYS.lastError]).toBeNull();
  });

  it('handleCapture returns NO_TOKEN when session empty', async () => {
    const storage = createMemoryStorage();
    const result = await handleCapture(
      { storage },
      {
        requestId: 'r1',
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'NO_TOKEN', requestId: 'r1' });
    expect(storage.store[STORAGE_KEYS.lastError]).toMatch(/JWT/);
  });

  it('handleCapture runs ingest path and clears lastError on success', async () => {
    const storage = createMemoryStorage();
    const runCaptureFn = vi.fn(async () => ({
      ok: true as const,
      requestId: 'r2',
      status: 'saved' as const,
      productId: 'p1',
      stock: 2,
      price: 3,
      konk: 'air',
      skuId: 's1',
    }));
    const result = await handleCapture(
      {
        storage,
        createCaptureDeps: () => ({
          queryTabs: vi.fn(),
          createTab: vi.fn(),
          waitForTabComplete: vi.fn(),
          captureHtml: vi.fn(),
          ingestHtml: vi.fn(),
        }),
        runCaptureFn,
      },
      {
        requestId: 'r2',
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
        token: 'jwt',
      },
    );
    expect(result).toMatchObject({ ok: true, status: 'saved', productId: 'p1' });
    expect(storage.store[STORAGE_KEYS.lastError]).toBeNull();
    expect(runCaptureFn).toHaveBeenCalled();
  });

  it('handleCapture records lastError on capture failure', async () => {
    const storage = createMemoryStorage();
    const result = await handleCapture(
      {
        storage,
        createCaptureDeps: () => ({
          queryTabs: vi.fn(),
          createTab: vi.fn(),
          waitForTabComplete: vi.fn(),
          captureHtml: vi.fn(),
          ingestHtml: vi.fn(),
        }),
        runCaptureFn: vi.fn(async () => ({
          ok: false as const,
          requestId: 'r3',
          code: 'PARSE_FAILED',
          message: 'bad',
          konk: 'air',
          skuId: 's1',
        })),
      },
      {
        requestId: 'r3',
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
        token: 'jwt',
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'PARSE_FAILED' });
    expect(storage.store[STORAGE_KEYS.lastError]).toBe('PARSE_FAILED: bad');
  });

  it('dispatchSwMessage rejects unknown messages synchronously', () => {
    const sendResponse = vi.fn();
    const asyncPending = dispatchSwMessage(
      { storage: createMemoryStorage() },
      { type: 'NOPE' },
      sendResponse,
    );
    expect(asyncPending).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ code: 'BAD_MESSAGE' }));
  });

  it('dispatchSwMessage TOKEN_SYNC responds async and maps handler rejection', async () => {
    const sendResponse = vi.fn();
    const storage = {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {
        throw new Error('storage down');
      }),
    };
    const asyncPending = dispatchSwMessage(
      { storage },
      { type: 'TOKEN_SYNC', token: 'jwt' },
      sendResponse,
    );
    expect(asyncPending).toBe(true);
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false, code: 'TOKEN_SYNC_FAILED', message: 'storage down' }),
      ),
    );
  });

  it('dispatchSwMessage CAPTURE_REQUEST maps unexpected throws to HANDLER_FAILED', async () => {
    const sendResponse = vi.fn();
    const asyncPending = dispatchSwMessage(
      {
        storage: createMemoryStorage({ [STORAGE_KEYS.token]: 'jwt' }),
        createCaptureDeps: () => ({
          queryTabs: vi.fn(),
          createTab: vi.fn(),
          waitForTabComplete: vi.fn(),
          captureHtml: vi.fn(),
          ingestHtml: vi.fn(),
        }),
        runCaptureFn: vi.fn(async () => {
          throw new Error('boom');
        }),
      },
      {
        type: 'CAPTURE_REQUEST',
        requestId: 'rx',
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
        token: 'jwt',
      },
      sendResponse,
    );
    expect(asyncPending).toBe(true);
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          code: 'HANDLER_FAILED',
          message: 'boom',
          requestId: 'rx',
          type: 'CAPTURE_RESULT',
        }),
      ),
    );
  });
});
