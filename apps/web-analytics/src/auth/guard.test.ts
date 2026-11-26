import { describe, expect, it } from 'vitest';
import { resolveAuthGate } from './guard.js';
import { AUTH_TOKEN_KEY, type TokenStorage } from './session.js';

function storageWithToken(token: string | null): TokenStorage {
  return {
    getItem: (key) => (key === AUTH_TOKEN_KEY ? token : null),
    setItem: () => undefined,
    removeItem: () => undefined,
  };
}

describe('web-analytics resolveAuthGate', () => {
  it('sends anonymous visitors to login for app routes', () => {
    expect(resolveAuthGate('/sales', storageWithToken(null))).toBe('login');
    expect(resolveAuthGate('/excel', storageWithToken(null))).toBe('login');
  });

  it('allows anonymous access to /login', () => {
    expect(resolveAuthGate('/login', storageWithToken(null))).toBe('allow');
  });

  it('sends authenticated users away from /login', () => {
    expect(resolveAuthGate('/login', storageWithToken('jwt'))).toBe('app');
  });

  it('allows authenticated access to app routes', () => {
    expect(resolveAuthGate('/sales', storageWithToken('jwt'))).toBe('allow');
    expect(resolveAuthGate('/statistics', storageWithToken('jwt'))).toBe('allow');
  });
});
