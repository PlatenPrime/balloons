import { describe, expect, it, vi } from 'vitest';
import { BRIDGE_SOURCE } from '../shared/protocol.js';
import {
  handleBackgroundResponse,
  handlePageMessageEvent,
  syncTokenFromPageStorage,
  WEB_SLICES_TOKEN_KEY,
  type BridgeRuntime,
} from './webSlicesBridgeLogic.js';

function createRuntime(overrides: Partial<BridgeRuntime> = {}): BridgeRuntime & {
  posted: unknown[];
  sent: unknown[];
} {
  const posted: unknown[] = [];
  const sent: unknown[] = [];
  return {
    posted,
    sent,
    postToPage: (message) => {
      posted.push(message);
    },
    sendToBackground: (message, callback) => {
      sent.push(message);
      callback(undefined);
    },
    getLastError: () => undefined,
    getLocalToken: () => null,
    ...overrides,
  };
}

describe('webSlicesBridgeLogic', () => {
  it('syncTokenFromPageStorage sends TOKEN_SYNC when local token exists', () => {
    const runtime = createRuntime({
      getLocalToken: () => 'jwt-from-page',
    });
    syncTokenFromPageStorage(runtime);
    expect(runtime.sent[0]).toEqual({ type: 'TOKEN_SYNC', token: 'jwt-from-page' });
  });

  it('syncTokenFromPageStorage no-ops without token and swallows errors', () => {
    const runtime = createRuntime({
      getLocalToken: () => null,
      sendToBackground: vi.fn(),
    });
    syncTokenFromPageStorage(runtime);
    expect(runtime.sendToBackground).not.toHaveBeenCalled();

    const throwing = createRuntime({
      getLocalToken: () => {
        throw new Error('storage blocked');
      },
    });
    expect(() => syncTokenFromPageStorage(throwing)).not.toThrow();
  });

  it('handleBackgroundResponse posts EXTENSION_RUNTIME for capture failures', () => {
    const runtime = createRuntime({
      getLastError: () => ({ message: 'Extension context invalidated.' }),
    });
    handleBackgroundResponse(
      runtime,
      {
        source: BRIDGE_SOURCE,
        type: 'CAPTURE_REQUEST',
        requestId: 'r1',
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
      },
      undefined,
    );
    expect(runtime.posted[0]).toMatchObject({
      ok: false,
      code: 'EXTENSION_RUNTIME',
      requestId: 'r1',
    });
  });

  it('handleBackgroundResponse ignores runtime errors for TOKEN_SYNC', () => {
    const runtime = createRuntime({
      getLastError: () => ({ message: 'gone' }),
    });
    handleBackgroundResponse(
      runtime,
      { source: BRIDGE_SOURCE, type: 'TOKEN_SYNC', token: 'jwt' },
      undefined,
    );
    expect(runtime.posted).toHaveLength(0);
  });

  it('handleBackgroundResponse forwards CAPTURE_RESULT and maps BAD_RESPONSE', () => {
    const runtime = createRuntime();
    const okResult = {
      source: BRIDGE_SOURCE,
      type: 'CAPTURE_RESULT' as const,
      requestId: 'r2',
      ok: true as const,
      status: 'saved' as const,
      productId: 'p',
      stock: 1,
      price: 2,
      konk: 'air',
      skuId: 's1',
    };
    handleBackgroundResponse(
      runtime,
      {
        source: BRIDGE_SOURCE,
        type: 'CAPTURE_REQUEST',
        requestId: 'r2',
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
      },
      okResult,
    );
    expect(runtime.posted[0]).toEqual(okResult);

    handleBackgroundResponse(
      runtime,
      {
        source: BRIDGE_SOURCE,
        type: 'CAPTURE_REQUEST',
        requestId: 'r3',
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
      },
      { ok: true },
    );
    expect(runtime.posted[1]).toMatchObject({ ok: false, code: 'BAD_RESPONSE', requestId: 'r3' });
  });

  it('handlePageMessageEvent filters origin/source and routes CAPTURE_REQUEST', () => {
    const page = { self: { id: 'page' }, origin: 'http://localhost:5173' };
    const runtime = createRuntime({
      sendToBackground: (message, callback) => {
        runtime.sent.push(message);
        callback({
          source: BRIDGE_SOURCE,
          type: 'CAPTURE_RESULT',
          requestId: 'r4',
          ok: false,
          code: 'PARSE_FAILED',
          message: 'x',
          konk: 'air',
          skuId: 's1',
        });
      },
    });

    handlePageMessageEvent(
      runtime,
      { source: { id: 'other' }, origin: page.origin, data: { type: 'CAPTURE_REQUEST' } },
      page,
    );
    expect(runtime.sent).toHaveLength(0);

    handlePageMessageEvent(
      runtime,
      {
        source: page.self,
        origin: page.origin,
        data: {
          source: BRIDGE_SOURCE,
          type: 'CAPTURE_REQUEST',
          requestId: 'r4',
          konk: 'air',
          skuId: 's1',
          sourceUrl: 'https://example.com/p',
        },
      },
      page,
    );
    expect(runtime.sent[0]).toMatchObject({ type: 'CAPTURE_REQUEST', requestId: 'r4' });
    expect(runtime.posted[0]).toMatchObject({ ok: false, code: 'PARSE_FAILED' });
  });

  it('exposes the web-slices token storage key', () => {
    expect(WEB_SLICES_TOKEN_KEY).toBe('balloons.web-slices.token');
  });
});
