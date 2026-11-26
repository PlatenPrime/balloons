import { describe, expect, it } from 'vitest';
import {
  AUTH_TOKEN_KEY,
  clearToken,
  getToken,
  hasToken,
  setToken,
  type TokenStorage,
} from './session.js';

function createMemoryStorage(initial: Record<string, string> = {}): TokenStorage & {
  store: Record<string, string>;
} {
  const store = { ...initial };
  return {
    store,
    getItem: (key) => (key in store ? store[key]! : null),
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
}

describe('web-analytics session token helpers', () => {
  it('stores and reads a token under analytics key', () => {
    const storage = createMemoryStorage();
    expect(getToken(storage)).toBeNull();
    expect(hasToken(storage)).toBe(false);

    setToken('jwt-abc', storage);
    expect(getToken(storage)).toBe('jwt-abc');
    expect(hasToken(storage)).toBe(true);
    expect(storage.store[AUTH_TOKEN_KEY]).toBe('jwt-abc');
    expect(AUTH_TOKEN_KEY).toBe('balloons.web-analytics.token');
  });

  it('clears a token', () => {
    const storage = createMemoryStorage({ [AUTH_TOKEN_KEY]: 'jwt-abc' });
    clearToken(storage);
    expect(getToken(storage)).toBeNull();
    expect(hasToken(storage)).toBe(false);
  });

  it('treats empty string as unauthenticated', () => {
    const storage = createMemoryStorage({ [AUTH_TOKEN_KEY]: '' });
    expect(hasToken(storage)).toBe(false);
  });
});
