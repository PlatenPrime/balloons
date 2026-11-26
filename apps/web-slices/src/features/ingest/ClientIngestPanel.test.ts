import { describe, expect, it } from 'vitest';
import {
  formatCaptureError,
  formatCaptureResultMessage,
  formatIngestFailure,
  formatIngestSuccess,
} from './clientIngestFeedback.js';
import { ExtensionBridgeError } from './extensionBridge.js';
import { BRIDGE_SOURCE } from './extensionProtocol.js';

/**
 * Panel wires TanStack mutations to these formatters (see ClientIngestPanel.tsx).
 * Covers the Capture/ingest feedback branches without mounting React.
 */
describe('ClientIngestPanel feedback wiring', () => {
  it('paste-ingest success clears toward success banner text', () => {
    expect(
      formatIngestSuccess({
        ok: true,
        status: 'saved',
        productId: 'air-1',
        stock: 3,
      }),
    ).toContain('Ingest saved');
  });

  it('paste-ingest business failure surfaces code', () => {
    expect(
      formatIngestFailure({
        ok: false,
        code: 'NOT_SLICED',
        message: 'sku not in day',
      }),
    ).toBe('NOT_SLICED: sku not in day');
  });

  it('extension capture success and failure update the same banner channel', () => {
    expect(
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
        skuId: 's',
      }),
    ).toMatch(/^Capture saved:/);

    expect(
      formatCaptureError(new ExtensionBridgeError('NO_TOKEN', 'Log in before capturing')),
    ).toBe('NO_TOKEN: Log in before capturing');
  });
});
