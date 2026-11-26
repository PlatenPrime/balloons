import { describe, expect, it } from 'vitest';
import {
  BRIDGE_SOURCE,
  parseCaptureResultMessage,
  parsePageToExtensionMessage,
  parseSwMessage,
  toCaptureResultPageMessage,
  toSwMessage,
} from './protocol.js';

describe('extension protocol', () => {
  it('parses TOKEN_SYNC from page', () => {
    const msg = parsePageToExtensionMessage({
      source: BRIDGE_SOURCE,
      type: 'TOKEN_SYNC',
      token: 'jwt-token',
      apiBaseUrl: 'http://localhost:3000',
    });
    expect(msg).toEqual({
      source: BRIDGE_SOURCE,
      type: 'TOKEN_SYNC',
      token: 'jwt-token',
      apiBaseUrl: 'http://localhost:3000',
    });
  });

  it('parses CAPTURE_REQUEST and maps to SW message', () => {
    const page = parsePageToExtensionMessage({
      source: BRIDGE_SOURCE,
      type: 'CAPTURE_REQUEST',
      requestId: 'req-1',
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1',
      token: 'jwt',
    });
    expect(page?.type).toBe('CAPTURE_REQUEST');
    expect(toSwMessage(page!)).toEqual({
      type: 'CAPTURE_REQUEST',
      requestId: 'req-1',
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1',
      token: 'jwt',
    });
  });

  it('rejects foreign postMessage payloads', () => {
    expect(parsePageToExtensionMessage({ type: 'CAPTURE_REQUEST' })).toBeNull();
    expect(parseSwMessage({ type: 'NOPE' })).toBeNull();
  });

  it('round-trips capture success/error page messages', () => {
    const ok = toCaptureResultPageMessage({
      ok: true,
      requestId: 'r1',
      status: 'saved',
      productId: 'p1',
      stock: 3,
      price: 10.5,
      konk: 'air',
      skuId: 's1',
    });
    expect(parseCaptureResultMessage(ok)).toEqual(ok);

    const err = toCaptureResultPageMessage({
      ok: false,
      requestId: 'r2',
      code: 'PARSE_FAILED',
      message: 'bad html',
      konk: 'air',
      skuId: 's1',
    });
    expect(parseCaptureResultMessage(err)).toEqual(err);
  });
});
