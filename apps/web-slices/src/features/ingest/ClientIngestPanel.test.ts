import { describe, expect, it } from 'vitest';
import {
  formatCaptureError,
  formatCaptureResultMessage,
  formatIngestFailure,
  formatIngestSuccess,
} from './clientIngestFeedback.js';
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
 * ClientIngestPanel wires TanStack captureMutation to captureMutationLifecycle.
 * These tests exercise that lifecycle + request shaping used by lines 50–74.
 */
describe('ClientIngestPanel captureMutation lifecycle', () => {
  it('mutationFn payload is built from konk + pending row + apiBaseUrl', () => {
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

  it('onMutate → onSuccess(ok) → onSettled tracks capture state and invalidate flag', () => {
    let state = onCaptureMutate(
      { capturingSkuId: null, message: null, shouldInvalidatePending: false },
      { skuId: 'sku-1' },
    );
    expect(state.capturingSkuId).toBe('sku-1');
    expect(state.message).toBeNull();

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
    expect(state.message).toBe(
      formatCaptureResultMessage({
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
      }),
    );

    state = onCaptureSettled(state);
    expect(state.capturingSkuId).toBeNull();
    expect(state.message).toMatch(/^Capture saved:/);
  });

  it('onMutate → onError → onSettled keeps failure banner and clears capturing flag', () => {
    let state = onCaptureMutate(
      { capturingSkuId: null, message: 'old', shouldInvalidatePending: false },
      { skuId: 'sku-2' },
    );
    state = onCaptureError(state, new ExtensionBridgeError('NO_TOKEN', 'Log in before capturing'));
    expect(state.message).toBe(
      formatCaptureError(new ExtensionBridgeError('NO_TOKEN', 'Log in before capturing')),
    );
    expect(state.shouldInvalidatePending).toBe(false);
    state = onCaptureSettled(state);
    expect(state.capturingSkuId).toBeNull();
  });

  it('still formats paste-ingest banners for the shared panel channel', () => {
    expect(
      formatIngestSuccess({ ok: true, status: 'saved', productId: 'air-1', stock: 3 }),
    ).toContain('Ingest saved');
    expect(formatIngestFailure({ ok: false, code: 'NOT_SLICED', message: 'sku not in day' })).toBe(
      'NOT_SLICED: sku not in day',
    );
  });
});
