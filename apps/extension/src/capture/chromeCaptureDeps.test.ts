import { WebApiClientError } from '@balloons/web-api-client';
import { describe, expect, it, vi } from 'vitest';
import { CaptureScriptError } from './captureHtmlResult.js';
import { createChromeCaptureDeps, mapIngestClientError } from './chromeCaptureDeps.js';

describe('mapIngestClientError', () => {
  it('maps business-error body from WebApiClientError', () => {
    expect(
      mapIngestClientError(
        new WebApiClientError('HTTP 400', 400, {
          ok: false,
          code: 'PARSE_FAILED',
          message: 'bad html',
        }),
      ),
    ).toEqual({ ok: false, code: 'PARSE_FAILED', message: 'bad html' });
  });

  it('maps generic HTTP errors', () => {
    expect(mapIngestClientError(new WebApiClientError('boom', 500, null))).toEqual({
      ok: false,
      code: 'HTTP_ERROR',
      message: 'boom',
    });
  });

  it('maps unknown errors', () => {
    expect(mapIngestClientError(new Error('nope'))).toEqual({
      ok: false,
      code: 'INGEST_FAILED',
      message: 'nope',
    });
  });
});

describe('createChromeCaptureDeps', () => {
  it('captureHtml uses readExecuteScriptHtml and fails on bad script results', async () => {
    const deps = createChromeCaptureDeps({
      apiBaseUrl: 'http://localhost:3000',
      getToken: () => 'jwt',
      executeScript: vi.fn(async () => []),
      queryTabs: vi.fn(async () => []),
      createTab: vi.fn(async () => ({ id: 1 })),
      waitForTabComplete: vi.fn(async () => undefined),
      createClient: () => ({
        ingestHtml: vi.fn(),
      }),
    });

    await expect(deps.captureHtml(1)).rejects.toBeInstanceOf(CaptureScriptError);
  });

  it('captureHtml returns page HTML when script succeeds', async () => {
    const executeScript = vi.fn(async () => [{ result: '<html>ok</html>' }]);
    const deps = createChromeCaptureDeps({
      apiBaseUrl: 'http://localhost:3000',
      getToken: () => 'jwt',
      executeScript,
      queryTabs: vi.fn(async () => []),
      createTab: vi.fn(async () => ({ id: 1 })),
      waitForTabComplete: vi.fn(async () => undefined),
      createClient: () => ({
        ingestHtml: vi.fn(),
      }),
    });

    await expect(deps.captureHtml(9)).resolves.toBe('<html>ok</html>');
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 9 } }));
  });

  it('ingestHtml maps API success and business failure', async () => {
    const ingestHtml = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 'saved',
        date: '2026-07-15',
        productId: 'p1',
        stock: 2,
        price: 3,
      })
      .mockResolvedValueOnce({
        ok: false,
        code: 'URL_MISMATCH',
        message: 'url',
      });

    const deps = createChromeCaptureDeps({
      apiBaseUrl: 'http://localhost:3000',
      getToken: () => 'jwt',
      executeScript: vi.fn(async () => [{ result: '<html/>' }]),
      queryTabs: vi.fn(async () => []),
      createTab: vi.fn(async () => ({ id: 1 })),
      waitForTabComplete: vi.fn(async () => undefined),
      createClient: () => ({ ingestHtml }),
    });

    await expect(
      deps.ingestHtml({
        konk: 'air',
        skuId: 's1',
        html: '<html/>',
        sourceUrl: 'https://example.com/p',
      }),
    ).resolves.toEqual({
      ok: true,
      status: 'saved',
      productId: 'p1',
      stock: 2,
      price: 3,
    });

    await expect(
      deps.ingestHtml({
        konk: 'air',
        skuId: 's1',
        html: '<html/>',
        sourceUrl: 'https://example.com/p',
      }),
    ).resolves.toEqual({ ok: false, code: 'URL_MISMATCH', message: 'url' });
  });
});
