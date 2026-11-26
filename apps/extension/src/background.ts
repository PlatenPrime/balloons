import { createChromeCaptureDeps } from './capture/chromeCaptureDeps.js';
import { runCapture } from './capture/runCapture.js';
import {
  DEFAULT_API_BASE_URL,
  parseSwMessage,
  toCaptureResultPageMessage,
  type CaptureResultMessage,
} from './shared/protocol.js';
import { respondAsync } from './shared/respondAsync.js';
import { readSession, writeLastError, writeToken } from './shared/storage.js';

const sessionStorage = chrome.storage.session;

async function handleTokenSync(token: string, apiBaseUrl?: string): Promise<{ ok: true }> {
  await writeToken(sessionStorage, token, apiBaseUrl);
  await writeLastError(sessionStorage, null);
  return { ok: true };
}

async function handleCapture(input: {
  requestId: string;
  konk: string;
  skuId: string;
  sourceUrl: string;
  token?: string;
  apiBaseUrl?: string;
}): Promise<CaptureResultMessage> {
  if (input.token) {
    await writeToken(sessionStorage, input.token, input.apiBaseUrl);
  }

  const session = await readSession(sessionStorage);
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
    await writeLastError(sessionStorage, message);
    return result;
  }

  const deps = createChromeCaptureDeps({
    apiBaseUrl,
    getToken: () => token,
  });

  const output = await runCapture(deps, {
    requestId: input.requestId,
    konk: input.konk,
    skuId: input.skuId,
    sourceUrl: input.sourceUrl,
  });

  const result = toCaptureResultPageMessage(output);
  if (!result.ok) {
    await writeLastError(sessionStorage, `${result.code}: ${result.message}`);
  } else {
    await writeLastError(sessionStorage, null);
  }
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const parsed = parseSwMessage(message);
  if (!parsed) {
    sendResponse({ ok: false, code: 'BAD_MESSAGE', message: 'Unrecognized extension message' });
    return false;
  }

  if (parsed.type === 'TOKEN_SYNC') {
    respondAsync(sendResponse, handleTokenSync(parsed.token, parsed.apiBaseUrl), (err) => ({
      ok: false,
      code: 'TOKEN_SYNC_FAILED',
      message: err instanceof Error ? err.message : 'Token sync failed',
    }));
    return true;
  }

  respondAsync(
    sendResponse,
    handleCapture({
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
});
