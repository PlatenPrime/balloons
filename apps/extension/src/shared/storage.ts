import { DEFAULT_API_BASE_URL } from './protocol.js';

export const STORAGE_KEYS = {
  token: 'balloons.extension.token',
  apiBaseUrl: 'balloons.extension.apiBaseUrl',
  lastError: 'balloons.extension.lastError',
} as const;

export type ExtensionSession = {
  token: string | null;
  apiBaseUrl: string;
  lastError: string | null;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export async function readSession(storage: StorageArea): Promise<ExtensionSession> {
  const raw = await storage.get([
    STORAGE_KEYS.token,
    STORAGE_KEYS.apiBaseUrl,
    STORAGE_KEYS.lastError,
  ]);
  const token = asOptionalString(raw[STORAGE_KEYS.token]);
  const storedApi = asOptionalString(raw[STORAGE_KEYS.apiBaseUrl]);
  const apiBaseUrl = storedApi && storedApi.length > 0 ? storedApi : DEFAULT_API_BASE_URL;
  const lastError = asOptionalString(raw[STORAGE_KEYS.lastError]);
  return { token, apiBaseUrl, lastError };
}

export async function writeToken(
  storage: StorageArea,
  token: string,
  apiBaseUrl?: string,
): Promise<void> {
  const items: Record<string, unknown> = { [STORAGE_KEYS.token]: token };
  if (apiBaseUrl !== undefined && apiBaseUrl.length > 0) {
    items[STORAGE_KEYS.apiBaseUrl] = apiBaseUrl;
  }
  await storage.set(items);
}

export async function writeLastError(storage: StorageArea, message: string | null): Promise<void> {
  await storage.set({ [STORAGE_KEYS.lastError]: message });
}
