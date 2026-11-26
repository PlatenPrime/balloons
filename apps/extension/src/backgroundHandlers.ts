import {
  createChromeCaptureDeps,
  type ChromeCaptureDepsOptions,
} from './capture/chromeCaptureDeps.js';
import { runCapture, type CaptureDeps, type RunCaptureOutput } from './capture/runCapture.js';
import {
  DEFAULT_API_BASE_URL,
  parseSwMessage,
  toCaptureResultPageMessage,
  type CaptureResultMessage,
} from './shared/protocol.js';
import { respondAsync } from './shared/respondAsync.js';
import {
  readSession,
  writeLastError,
  writeToken,
  type ExtensionSession,
} from './shared/storage.js';

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

export type BackgroundHandlerDeps = {
  storage: StorageArea;
  createCaptureDeps?: (opts: ChromeCaptureDepsOptions) => CaptureDeps;
  runCaptureFn?: (
    deps: CaptureDeps,
    input: {
      requestId: string;
      konk: string;
      skuId: string;
      sourceUrl: string;
    },
  ) => Promise<RunCaptureOutput>;
};

export async function handleTokenSync(
  deps: BackgroundHandlerDeps,
  token: string,
  apiBaseUrl?: string,
): Promise<{ ok: true }> {
  await writeToken(deps.storage, token, apiBaseUrl);
  await writeLastError(deps.storage, null);
  return { ok: true };
}

export async function handleCapture(
  deps: BackgroundHandlerDeps,
  input: {
    requestId: string;
    konk: string;
    skuId: string;
    sourceUrl: string;
    token?: string;
    apiBaseUrl?: string;
  },
): Promise<CaptureResultMessage> {
  if (input.token) {
    await writeToken(deps.storage, input.token, input.apiBaseUrl);
  }

  const session: ExtensionSession = await readSession(deps.storage);
  const token = input.token ?? session.token;
  const apiBaseUrl = input.apiBaseUrl ?? session.apiBaseUrl ?? DEFAULT_API_BASE_URL;

  if (!token) {
    const message = 'No JWT — log in to web-slices first';
    const result = toCaptureResultPageMessage({
      ok: false,
      requestId: input.requestId,
      code: 'NO_TOKEN',
      message,
      konk: input.konk,
      skuId: input.skuId,
    });
    await writeLastError(deps.storage, message);
    return result;
  }

  const createDeps = deps.createCaptureDeps ?? createChromeCaptureDeps;
  const capture = deps.runCaptureFn ?? runCapture;
  const captureDeps = createDeps({
    apiBaseUrl,
    getToken: () => token,
  });

  const output = await capture(captureDeps, {
    requestId: input.requestId,
    konk: input.konk,
    skuId: input.skuId,
    sourceUrl: input.sourceUrl,
  });

  const result = toCaptureResultPageMessage(output);
  if (!result.ok) {
    await writeLastError(deps.storage, `${result.code}: ${result.message}`);
  } else {
    await writeLastError(deps.storage, null);
  }
  return result;
}

/**
 * Chrome onMessage handler body. Returns whether an async response is pending.
 */
export function dispatchSwMessage(
  deps: BackgroundHandlerDeps,
  message: unknown,
  sendResponse: (response: unknown) => void,
): boolean {
  const parsed = parseSwMessage(message);
  if (!parsed) {
    sendResponse({ ok: false, code: 'BAD_MESSAGE', message: 'Unrecognized extension message' });
    return false;
  }

  if (parsed.type === 'TOKEN_SYNC') {
    respondAsync(sendResponse, handleTokenSync(deps, parsed.token, parsed.apiBaseUrl), (err) => ({
      ok: false,
      code: 'TOKEN_SYNC_FAILED',
      message: err instanceof Error ? err.message : 'Token sync failed',
    }));
    return true;
  }

  respondAsync(
    sendResponse,
    handleCapture(deps, {
      requestId: parsed.requestId,
      konk: parsed.konk,
      skuId: parsed.skuId,
      sourceUrl: parsed.sourceUrl,
      ...(parsed.token !== undefined ? { token: parsed.token } : {}),
      ...(parsed.apiBaseUrl !== undefined ? { apiBaseUrl: parsed.apiBaseUrl } : {}),
    }),
    (err) =>
      toCaptureResultPageMessage({
        ok: false,
        requestId: parsed.requestId,
        code: 'HANDLER_FAILED',
        message: err instanceof Error ? err.message : 'Capture handler failed',
        konk: parsed.konk,
        skuId: parsed.skuId,
      }),
  );

  return true;
}
