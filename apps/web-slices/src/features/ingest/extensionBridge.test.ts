import { describe, expect, it, vi } from 'vitest';
import {
  ExtensionBridgeError,
  requestExtensionCapture,
  resolveExtensionToken,
} from './extensionBridge.js';
import { BRIDGE_SOURCE } from './extensionProtocol.js';

describe('requestExtensionCapture', () => {
  it('rejects without token when session is empty (null and undefined both fall back)', async () => {
    await expect(
      requestExtensionCapture({
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
        token: null,
        getToken: () => null,
      }),
    ).rejects.toMatchObject({ code: 'NO_TOKEN' });

    await expect(
      requestExtensionCapture({
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
        getToken: () => null,
      }),
    ).rejects.toMatchObject({ code: 'NO_TOKEN' });
  });

  it('treats token null like undefined and falls back to getToken', () => {
    expect(resolveExtensionToken(null, () => 'from-session')).toBe('from-session');
    expect(resolveExtensionToken(undefined, () => 'from-session')).toBe('from-session');
    expect(resolveExtensionToken('explicit', () => 'from-session')).toBe('explicit');
  });

  it('posts TOKEN_SYNC + CAPTURE_REQUEST and resolves on matching result', async () => {
    const posted: unknown[] = [];
    const listeners: Array<(event: MessageEvent) => void> = [];
    const pageSource = { id: 'page' };

    const promise = requestExtensionCapture({
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1',
      token: 'jwt',
      apiBaseUrl: 'http://localhost:3000',
      targetOrigin: 'http://localhost:5173',
      expectedMessageSource: pageSource,
      createRequestId: () => 'req-fixed',
      postMessage: (data) => {
        posted.push(data);
      },
      addEventListener: (_type, listener) => {
        listeners.push(listener);
      },
      removeEventListener: vi.fn(),
    });

    expect(posted[0]).toMatchObject({ type: 'TOKEN_SYNC', token: 'jwt' });
    expect(posted[1]).toMatchObject({
      type: 'CAPTURE_REQUEST',
      requestId: 'req-fixed',
      konk: 'air',
      skuId: 'sku-1',
    });

    const listener = listeners[0];
    expect(listener).toBeTypeOf('function');
    listener!({
      source: pageSource,
      data: {
        source: BRIDGE_SOURCE,
        type: 'CAPTURE_RESULT',
        requestId: 'req-fixed',
        ok: true,
        status: 'saved',
        productId: 'p1',
        stock: 1,
        price: 2,
        konk: 'air',
        skuId: 'sku-1',
      },
    } as unknown as MessageEvent);

    await expect(promise).resolves.toMatchObject({ ok: true, status: 'saved', productId: 'p1' });
  });

  it('times out when extension is silent', async () => {
    await expect(
      requestExtensionCapture({
        konk: 'air',
        skuId: 's1',
        sourceUrl: 'https://example.com/p',
        token: 'jwt',
        timeoutMs: 20,
        targetOrigin: '*',
        expectedMessageSource: null,
        createRequestId: () => 'req-timeout',
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(ExtensionBridgeError);
  });
});
