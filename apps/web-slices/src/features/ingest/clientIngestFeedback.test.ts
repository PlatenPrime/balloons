import { describe, expect, it } from 'vitest';
import {
  formatCaptureError,
  formatCaptureResultMessage,
  formatIngestError,
  formatIngestFailure,
  formatIngestSuccess,
} from './clientIngestFeedback.js';
import { ExtensionBridgeError } from './extensionBridge.js';
import { BRIDGE_SOURCE } from './extensionProtocol.js';

describe('clientIngestFeedback', () => {
  it('formats ingest success and failure', () => {
    expect(
      formatIngestSuccess({
        ok: true,
        status: 'saved',
        productId: 'p1',
        stock: 4,
      }),
    ).toBe('Ingest saved: product p1 stock=4');

    expect(formatIngestFailure({ ok: false, code: 'PARSE_FAILED', message: 'bad' })).toBe(
      'PARSE_FAILED: bad',
    );
  });

  it('formats capture result messages', () => {
    expect(
      formatCaptureResultMessage({
        source: BRIDGE_SOURCE,
        type: 'CAPTURE_RESULT',
        requestId: 'r1',
        ok: true,
        status: 'skipped',
        productId: 'p2',
        stock: 1,
        price: 9.5,
        konk: 'air',
        skuId: 's1',
      }),
    ).toBe('Capture skipped: product p2 stock=1 price=9.5');

    expect(
      formatCaptureResultMessage({
        source: BRIDGE_SOURCE,
        type: 'CAPTURE_RESULT',
        requestId: 'r2',
        ok: false,
        code: 'SCRIPT_FAILED',
        message: 'no results',
      }),
    ).toBe('SCRIPT_FAILED: no results');
  });

  it('formats capture/ingest errors for banners', () => {
    expect(formatCaptureError(new ExtensionBridgeError('TIMEOUT', 'slow'))).toBe('TIMEOUT: slow');
    expect(formatCaptureError(new Error('x'))).toBe('x');
    expect(formatIngestError(new Error('ingest down'))).toBe('ingest down');
  });
});
