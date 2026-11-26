import { describe, expect, it } from 'vitest';
import { DEFAULT_API_BASE_URL } from './protocol.js';
import { readSession, STORAGE_KEYS, writeLastError, writeToken } from './storage.js';

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

describe('extension storage', () => {
  it('reads defaults when empty', async () => {
    const storage = createMemoryStorage();
    await expect(readSession(storage)).resolves.toEqual({
      token: null,
      apiBaseUrl: DEFAULT_API_BASE_URL,
      lastError: null,
    });
  });

  it('writeToken stores token and optional apiBaseUrl', async () => {
    const storage = createMemoryStorage();
    await writeToken(storage, 'jwt-1');
    expect(storage.store[STORAGE_KEYS.token]).toBe('jwt-1');
    expect(storage.store[STORAGE_KEYS.apiBaseUrl]).toBeUndefined();

    await writeToken(storage, 'jwt-2', 'http://localhost:3001');
    const session = await readSession(storage);
    expect(session).toEqual({
      token: 'jwt-2',
      apiBaseUrl: 'http://localhost:3001',
      lastError: null,
    });
  });

  it('writeLastError round-trips and clears', async () => {
    const storage = createMemoryStorage();
    await writeLastError(storage, 'boom');
    expect((await readSession(storage)).lastError).toBe('boom');
    await writeLastError(storage, null);
    expect((await readSession(storage)).lastError).toBeNull();
  });

  it('ignores non-string stored values', async () => {
    const storage = createMemoryStorage({
      [STORAGE_KEYS.token]: 123,
      [STORAGE_KEYS.apiBaseUrl]: '',
      [STORAGE_KEYS.lastError]: { x: 1 },
    });
    await expect(readSession(storage)).resolves.toEqual({
      token: null,
      apiBaseUrl: DEFAULT_API_BASE_URL,
      lastError: null,
    });
  });
});
