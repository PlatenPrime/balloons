import { describe, expect, it } from 'vitest';
import {
  buildExtensionCaptureRequest,
  onCaptureError,
  onCaptureMutate,
  onCaptureSettled,
  onCaptureSuccess,
} from './captureMutationLifecycle.js';
import { ExtensionBridgeError } from './extensionBridge.js';
import { BRIDGE_SOURCE } from './extensionProtocol.js';

/**
 * Pure lifecycle helpers used by ClientIngestPanel captureMutation.
 * React wiring is covered in ClientIngestPanel.test.tsx.
 */
describe('ClientIngestPanel captureMutation helpers', () => {
  it('builds extension capture request for mutationFn', () => {
    expect(
      buildExtensionCaptureRequest({
        konk: 'air',
        skuId: 'sku-9',
        sourceUrl: 'https://example.com/product/9',
        apiBaseUrl: 'http://localhost:3000',
      }),
    ).toEqual({
      konk: 'air',
      skuId: 'sku-9',
      sourceUrl: 'https://example.com/product/9',
      apiBaseUrl: 'http://localhost:3000',
    });
  });

  it('runs mutate → success → settled state transitions', () => {
    let state = onCaptureMutate(
      { capturingSkuId: null, message: null, shouldInvalidatePending: false },
      { skuId: 'sku-1' },
    );
    state = onCaptureSuccess(state, {
      source: BRIDGE_SOURCE,
      type: 'CAPTURE_RESULT',
      requestId: 'req',
      ok: true,
      status: 'saved',
      productId: 'p',
      stock: 1,
      price: 2,
      konk: 'air',
      skuId: 'sku-1',
    });
    expect(state.shouldInvalidatePending).toBe(true);
    state = onCaptureSettled(state);
    expect(state.capturingSkuId).toBeNull();
  });

  it('runs mutate → error → settled without invalidate', () => {
    let state = onCaptureMutate(
      { capturingSkuId: null, message: 'old', shouldInvalidatePending: false },
      { skuId: 'sku-2' },
    );
    state = onCaptureError(state, new ExtensionBridgeError('NO_TOKEN', 'Log in before capturing'));
    expect(state.shouldInvalidatePending).toBe(false);
    state = onCaptureSettled(state);
    expect(state.capturingSkuId).toBeNull();
  });
});
