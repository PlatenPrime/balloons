export const AUTH_TOKEN_KEY = 'balloons.web-slices.token';

export type TokenStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function getToken(storage: TokenStorage = localStorage): string | null {
  return storage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string, storage: TokenStorage = localStorage): void {
  storage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearToken(storage: TokenStorage = localStorage): void {
  storage.removeItem(AUTH_TOKEN_KEY);
}

export function hasToken(storage: TokenStorage = localStorage): boolean {
  const token = getToken(storage);
  return typeof token === 'string' && token.length > 0;
}
