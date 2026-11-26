import { urlsMatch } from '../shared/urls.js';
import { CaptureScriptError } from './captureHtmlResult.js';

export type CaptureIngestSuccess = {
  ok: true;
  status: 'saved' | 'skipped';
  productId: string;
  stock: number;
  price: number;
};

export type CaptureIngestFailure = {
  ok: false;
  code: string;
  message: string;
};

export type CaptureIngestResult = CaptureIngestSuccess | CaptureIngestFailure;

export type CaptureDeps = {
  queryTabs: () => Promise<Array<{ id?: number; url?: string }>>;
  createTab: (url: string) => Promise<{ id?: number }>;
  waitForTabComplete: (tabId: number) => Promise<void>;
  captureHtml: (tabId: number) => Promise<string>;
  ingestHtml: (input: {
    konk: string;
    skuId: string;
    html: string;
    sourceUrl: string;
  }) => Promise<CaptureIngestResult>;
};

export type RunCaptureInput = {
  requestId: string;
  konk: string;
  skuId: string;
  sourceUrl: string;
};

export type RunCaptureOutput =
  | {
      ok: true;
      requestId: string;
      status: 'saved' | 'skipped';
      productId: string;
      stock: number;
      price: number;
      konk: string;
      skuId: string;
    }
  | {
      ok: false;
      requestId: string;
      code: string;
      message: string;
      konk: string;
      skuId: string;
    };

async function resolveTabId(deps: CaptureDeps, sourceUrl: string): Promise<number> {
  const tabs = await deps.queryTabs();
  const existing = tabs.find((tab) => typeof tab.url === 'string' && urlsMatch(tab.url, sourceUrl));
  if (existing?.id !== undefined) {
    return existing.id;
  }

  const created = await deps.createTab(sourceUrl);
  if (created.id === undefined) {
    throw new Error('Failed to open capture tab');
  }
  await deps.waitForTabComplete(created.id);
  return created.id;
}

/**
 * Find or open a tab for `sourceUrl`, capture outerHTML, POST ingest.
 * Uses the pending/catalog `sourceUrl` in the ingest body (not redirected tab.url).
 */
export async function runCapture(
  deps: CaptureDeps,
  input: RunCaptureInput,
): Promise<RunCaptureOutput> {
  const { requestId, konk, skuId, sourceUrl } = input;
  try {
    const tabId = await resolveTabId(deps, sourceUrl);
    const html = await deps.captureHtml(tabId);
    if (!html || html.trim().length === 0) {
      return {
        ok: false,
        requestId,
        code: 'EMPTY_HTML',
        message: 'Captured HTML was empty',
        konk,
        skuId,
      };
    }

    const result = await deps.ingestHtml({ konk, skuId, html, sourceUrl });
    if (!result.ok) {
      return {
        ok: false,
        requestId,
        code: result.code,
        message: result.message,
        konk,
        skuId,
      };
    }

    return {
      ok: true,
      requestId,
      status: result.status,
      productId: result.productId,
      stock: result.stock,
      price: result.price,
      konk,
      skuId,
    };
  } catch (err) {
    if (err instanceof CaptureScriptError) {
      return {
        ok: false,
        requestId,
        code: err.code,
        message: err.message,
        konk,
        skuId,
      };
    }
    return {
      ok: false,
      requestId,
      code: 'CAPTURE_FAILED',
      message: err instanceof Error ? err.message : 'Capture failed',
      konk,
      skuId,
    };
  }
}
