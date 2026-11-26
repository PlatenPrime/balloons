import { describe, expect, it } from 'vitest';
import {
  buildExtensionCaptureRequest,
  onCaptureError,
  onCaptureMutate,
  onCaptureSettled,
  onCaptureSuccess,
  type CaptureMutationUiState,
} from './captureMutationLifecycle.js';
import { ExtensionBridgeError } from './extensionBridge.js';
import { BRIDGE_SOURCE } from './extensionProtocol.js';

const initial: CaptureMutationUiState = {
  capturingSkuId: null,
  message: 'stale',
  shouldInvalidatePending: false,
};

describe('captureMutationLifecycle', () => {
  it('onMutate tracks sku and clears banner', () => {
    expect(onCaptureMutate(initial, { skuId: 'sku-1' })).toEqual({
      capturingSkuId: 'sku-1',
      message: null,
      shouldInvalidatePending: false,
    });
  });

  it('onSuccess formats banner and flags invalidate only when ok', () => {
    const ok = onCaptureSuccess(initial, {
      source: BRIDGE_SOURCE,
      type: 'CAPTURE_RESULT',
      requestId: 'r1',
      ok: true,
      status: 'saved',
      productId: 'p1',
      stock: 2,
      price: 3,
      konk: 'air',
      skuId: 'sku-1',
    });
    expect(ok.message).toMatch(/^Capture saved:/);
    expect(ok.shouldInvalidatePending).toBe(true);

    const fail = onCaptureSuccess(initial, {
      source: BRIDGE_SOURCE,
      type: 'CAPTURE_RESULT',
      requestId: 'r2',
      ok: false,
      code: 'PARSE_FAILED',
      message: 'bad',
    });
    expect(fail.message).toBe('PARSE_FAILED: bad');
    expect(fail.shouldInvalidatePending).toBe(false);
  });

  it('onError formats bridge errors and onSettled clears capturingSkuId', () => {
    const errored = onCaptureError(
      { ...initial, capturingSkuId: 'sku-1' },
      new ExtensionBridgeError('TIMEOUT', 'slow'),
    );
    expect(errored.message).toBe('TIMEOUT: slow');
    expect(errored.shouldInvalidatePending).toBe(false);
    expect(onCaptureSettled(errored).capturingSkuId).toBeNull();
  });

  it('buildExtensionCaptureRequest matches panel mutationFn payload', () => {
    expect(
      buildExtensionCaptureRequest({
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
        apiBaseUrl: 'http://localhost:3000',
      }),
    ).toEqual({
      konk: 'air',
      skuId: 's1',
      sourceUrl: 'https://example.com/p',
      apiBaseUrl: 'http://localhost:3000',
    });
  });
});
