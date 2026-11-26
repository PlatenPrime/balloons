import { describe, expect, it, vi } from 'vitest';
import { runCapture, type CaptureDeps } from './runCapture.js';

function createDeps(overrides: Partial<CaptureDeps> = {}): CaptureDeps {
  return {
    queryTabs: vi.fn(async () => [{ id: 7, url: 'https://example.com/product/1' }]),
    createTab: vi.fn(async () => ({ id: 9 })),
    waitForTabComplete: vi.fn(async () => undefined),
    captureHtml: vi.fn(async () => '<html><body>ok</body></html>'),
    ingestHtml: vi.fn(async () => ({
      ok: true as const,
      status: 'saved' as const,
      productId: 'p1',
      stock: 2,
      price: 9.5,
    })),
    ...overrides,
  };
}

describe('runCapture', () => {
  it('reuses a matching tab and ingests HTML', async () => {
    const deps = createDeps();
    const result = await runCapture(deps, {
      requestId: 'req-1',
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1/',
    });

    expect(deps.createTab).not.toHaveBeenCalled();
    expect(deps.captureHtml).toHaveBeenCalledWith(7);
    expect(deps.ingestHtml).toHaveBeenCalledWith({
      konk: 'air',
      skuId: 'sku-1',
      html: '<html><body>ok</body></html>',
      sourceUrl: 'https://example.com/product/1/',
    });
    expect(result).toEqual({
      ok: true,
      requestId: 'req-1',
      status: 'saved',
      productId: 'p1',
      stock: 2,
      price: 9.5,
      konk: 'air',
      skuId: 'sku-1',
    });
  });

  it('opens a tab when none match', async () => {
    const deps = createDeps({
      queryTabs: vi.fn(async () => []),
    });
    await runCapture(deps, {
      requestId: 'req-2',
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1',
    });
    expect(deps.createTab).toHaveBeenCalledWith('https://example.com/product/1');
    expect(deps.waitForTabComplete).toHaveBeenCalledWith(9);
    expect(deps.captureHtml).toHaveBeenCalledWith(9);
  });

  it('maps ingest business errors', async () => {
    const deps = createDeps({
      ingestHtml: vi.fn(async () => ({
        ok: false as const,
        code: 'PARSE_FAILED',
        message: 'no stock',
      })),
    });
    const result = await runCapture(deps, {
      requestId: 'req-3',
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1',
    });
    expect(result).toMatchObject({
      ok: false,
      code: 'PARSE_FAILED',
      message: 'no stock',
      requestId: 'req-3',
    });
  });

  it('fails on empty HTML', async () => {
    const deps = createDeps({
      captureHtml: vi.fn(async () => '   '),
    });
    const result = await runCapture(deps, {
      requestId: 'req-4',
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1',
    });
    expect(result).toMatchObject({ ok: false, code: 'EMPTY_HTML' });
  });

  it('maps CaptureScriptError to SCRIPT_FAILED (not EMPTY_HTML)', async () => {
    const { CaptureScriptError } = await import('./captureHtmlResult.js');
    const deps = createDeps({
      captureHtml: vi.fn(async () => {
        throw new CaptureScriptError('executeScript returned no results');
      }),
    });
    const result = await runCapture(deps, {
      requestId: 'req-5',
      konk: 'air',
      skuId: 'sku-1',
      sourceUrl: 'https://example.com/product/1',
    });
    expect(result).toMatchObject({
      ok: false,
      code: 'SCRIPT_FAILED',
      message: 'executeScript returned no results',
    });
  });
});
