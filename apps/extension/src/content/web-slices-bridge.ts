import {
  BRIDGE_SOURCE,
  parsePageToExtensionMessage,
  toCaptureResultPageMessage,
  toSwMessage,
  type CaptureResultMessage,
} from '../shared/protocol.js';

const WEB_SLICES_TOKEN_KEY = 'balloons.web-slices.token';

function postToPage(message: CaptureResultMessage): void {
  window.postMessage(message, window.location.origin);
}

function syncTokenFromPageStorage(): void {
  try {
    const token = window.localStorage.getItem(WEB_SLICES_TOKEN_KEY);
    if (!token) return;
    void chrome.runtime.sendMessage(
      toSwMessage({
        source: BRIDGE_SOURCE,
        type: 'TOKEN_SYNC',
        token,
      }),
    );
  } catch {
    // Extension context invalidated or storage unavailable — ignore.
  }
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

  const parsed = parsePageToExtensionMessage(event.data);
  if (!parsed) return;

  void chrome.runtime.sendMessage(toSwMessage(parsed), (response: unknown) => {
    const runtimeError = chrome.runtime.lastError;
    if (runtimeError) {
      if (parsed.type === 'CAPTURE_REQUEST') {
        postToPage(
          toCaptureResultPageMessage({
            ok: false,
            requestId: parsed.requestId,
            code: 'EXTENSION_RUNTIME',
            message: runtimeError.message ?? 'Extension runtime error',
            konk: parsed.konk,
            skuId: parsed.skuId,
          }),
        );
      }
      return;
    }

    if (parsed.type !== 'CAPTURE_REQUEST') return;

    if (
      response &&
      typeof response === 'object' &&
      'type' in response &&
      (response as { type: unknown }).type === 'CAPTURE_RESULT'
    ) {
      postToPage(response as CaptureResultMessage);
      return;
    }

    postToPage(
      toCaptureResultPageMessage({
        ok: false,
        requestId: parsed.requestId,
        code: 'BAD_RESPONSE',
        message: 'Unexpected response from extension background',
        konk: parsed.konk,
        skuId: parsed.skuId,
      }),
    );
  });
});

syncTokenFromPageStorage();
