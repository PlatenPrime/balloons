import { getToken } from '../../auth/session.js';
import {
  BRIDGE_SOURCE,
  parseCaptureResultMessage,
  type CaptureResultMessage,
} from './extensionProtocol.js';

export type RequestExtensionCaptureInput = {
  konk: string;
  skuId: string;
  sourceUrl: string;
  apiBaseUrl?: string;
  /** Explicit token; `null`/`undefined` both fall back to `getToken`. */
  token?: string | null;
  getToken?: () => string | null;
  timeoutMs?: number;
  targetOrigin?: string;
  expectedMessageSource?: unknown;
  postMessage?: (message: unknown, targetOrigin: string) => void;
  addEventListener?: (type: 'message', listener: (event: MessageEvent) => void) => void;
  removeEventListener?: (type: 'message', listener: (event: MessageEvent) => void) => void;
  createRequestId?: () => string;
};

/** Default wait for extension CAPTURE_RESULT before unlocking Capture UI. */
export const DEFAULT_EXTENSION_CAPTURE_TIMEOUT_MS = 15_000;

export class ExtensionBridgeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ExtensionBridgeError';
    this.code = code;
  }
}

function defaultTargetOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '*';
}

/** `null` and `undefined` both mean "not provided" → read from session. */
export function resolveExtensionToken(
  explicit: string | null | undefined,
  readToken: () => string | null,
): string | null {
  if (explicit === undefined || explicit === null) {
    return readToken();
  }
  return explicit;
}

/**
 * Ask the MV3 content script (via window.postMessage) to capture + ingest.
 * Fail-soft: rejects with EXTENSION_UNAVAILABLE / TIMEOUT if the extension is missing.
 */
export function requestExtensionCapture(
  input: RequestExtensionCaptureInput,
): Promise<CaptureResultMessage> {
  const token = resolveExtensionToken(input.token, input.getToken ?? getToken);
  if (!token) {
    return Promise.reject(new ExtensionBridgeError('NO_TOKEN', 'Log in before capturing'));
  }

  const postMessage =
    input.postMessage ??
    ((message: unknown, targetOrigin: string) => {
      window.postMessage(message, targetOrigin);
    });
  const addEventListener =
    input.addEventListener ??
    ((type, listener) => {
      window.addEventListener(type, listener as EventListener);
    });
  const removeEventListener =
    input.removeEventListener ??
    ((type, listener) => {
      window.removeEventListener(type, listener as EventListener);
    });
  const createRequestId = input.createRequestId ?? (() => globalThis.crypto.randomUUID());
  const timeoutMs = input.timeoutMs ?? DEFAULT_EXTENSION_CAPTURE_TIMEOUT_MS;
  const requestId = createRequestId();
  const targetOrigin = input.targetOrigin ?? defaultTargetOrigin();
  const expectedSource =
    input.expectedMessageSource !== undefined
      ? input.expectedMessageSource
      : typeof window !== 'undefined'
        ? window
        : null;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new ExtensionBridgeError(
          'TIMEOUT',
          'Extension did not respond — is balloons extension loaded on this origin?',
        ),
      );
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      if (expectedSource !== null && event.source !== expectedSource) return;
      const result = parseCaptureResultMessage(event.data);
      if (!result || result.requestId !== requestId) return;
      cleanup();
      resolve(result);
    };

    const cleanup = () => {
      clearTimeout(timer);
      removeEventListener('message', onMessage);
    };

    addEventListener('message', onMessage);

    postMessage(
      {
        source: BRIDGE_SOURCE,
        type: 'TOKEN_SYNC',
        token,
        ...(input.apiBaseUrl !== undefined ? { apiBaseUrl: input.apiBaseUrl } : {}),
      },
      targetOrigin,
    );

    postMessage(
      {
        source: BRIDGE_SOURCE,
        type: 'CAPTURE_REQUEST',
        requestId,
        konk: input.konk,
        skuId: input.skuId,
        sourceUrl: input.sourceUrl,
        token,
        ...(input.apiBaseUrl !== undefined ? { apiBaseUrl: input.apiBaseUrl } : {}),
      },
      targetOrigin,
    );
  });
}
