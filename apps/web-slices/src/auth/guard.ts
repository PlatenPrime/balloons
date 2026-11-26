import { hasToken, type TokenStorage } from './session.js';

export type AuthGateResult = 'allow' | 'login' | 'app';

/** Decide where a visitor should land for a given path. */
export function resolveAuthGate(
  pathname: string,
  storage: TokenStorage = localStorage,
): AuthGateResult {
  const authenticated = hasToken(storage);
  const isLogin = pathname === '/login' || pathname.startsWith('/login/');

  if (!authenticated && !isLogin) return 'login';
  if (authenticated && isLogin) return 'app';
  return 'allow';
}
