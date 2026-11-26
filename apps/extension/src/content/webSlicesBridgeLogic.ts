import {
  BRIDGE_SOURCE,
  parsePageToExtensionMessage,
  toCaptureResultPageMessage,
  toSwMessage,
  type CaptureResultMessage,
  type PageToExtensionMessage,
} from '../shared/protocol.js';

export const WEB_SLICES_TOKEN_KEY = 'balloons.web-slices.token';

export type BridgeRuntime = {
  postToPage: (message: CaptureResultMessage) => void;
  sendToBackground: (message: unknown, callback: (response: unknown) => void) => void;
  getLastError: () => { message?: string } | undefined;
  getLocalToken: () => string | null;
};

export function syncTokenFromPageStorage(runtime: BridgeRuntime): void {
  try {
    const token = runtime.getLocalToken();
    if (!token) return;
    runtime.sendToBackground(
      toSwMessage({
        source: BRIDGE_SOURCE,
        type: 'TOKEN_SYNC',
        token,
      }),
      () => {
        // fire-and-forget; ignore sync ack / lastError
      },
    );
  } catch {
    // Extension context invalidated or storage unavailable — ignore.
  }
}

export function handleBackgroundResponse(
  runtime: BridgeRuntime,
  parsed: PageToExtensionMessage,
  response: unknown,
): void {
  const runtimeError = runtime.getLastError();
  if (runtimeError) {
    if (parsed.type === 'CAPTURE_REQUEST') {
      runtime.postToPage(
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
    runtime.postToPage(response as CaptureResultMessage);
    return;
  }

  runtime.postToPage(
    toCaptureResultPageMessage({
      ok: false,
      requestId: parsed.requestId,
      code: 'BAD_RESPONSE',
      message: 'Unexpected response from extension background',
      konk: parsed.konk,
      skuId: parsed.skuId,
    }),
  );
}

export function handlePageMessageEvent(
  runtime: BridgeRuntime,
  event: { source: unknown; origin: string; data: unknown },
  pageWindow: { self: unknown; origin: string },
): void {
  if (event.source !== pageWindow.self) return;
  if (event.origin !== pageWindow.origin) return;

  const parsed = parsePageToExtensionMessage(event.data);
  if (!parsed) return;

  runtime.sendToBackground(toSwMessage(parsed), (response) => {
    handleBackgroundResponse(runtime, parsed, response);
  });
}
