import { createWebApiClient, WebApiClientError, type WebApiClient } from '@balloons/web-api-client';
import { readExecuteScriptHtml } from './captureHtmlResult.js';
import type { CaptureDeps, CaptureIngestResult } from './runCapture.js';
import { createChromeWaitForTabComplete } from './waitForTabComplete.js';

export function mapIngestClientError(err: unknown): CaptureIngestResult {
  if (err instanceof WebApiClientError) {
    const body = err.body;
    if (
      body &&
      typeof body === 'object' &&
      'ok' in body &&
      (body as { ok: unknown }).ok === false &&
      'code' in body &&
      'message' in body
    ) {
      return {
        ok: false,
        code: String((body as { code: unknown }).code),
        message: String((body as { message: unknown }).message),
      };
    }
    return { ok: false, code: 'HTTP_ERROR', message: err.message };
  }
  return {
    ok: false,
    code: 'INGEST_FAILED',
    message: err instanceof Error ? err.message : 'Ingest failed',
  };
}

export type ChromeCaptureDepsOptions = {
  apiBaseUrl: string;
  getToken: () => string | null;
  createClient?: (opts: {
    baseUrl: string;
    getToken: () => string | null;
  }) => Pick<WebApiClient, 'ingestHtml'>;
  executeScript?: (args: {
    target: { tabId: number };
    func: () => string;
  }) => Promise<Array<{ result?: unknown }>>;
  queryTabs?: () => Promise<Array<{ id?: number; url?: string }>>;
  createTab?: (url: string) => Promise<{ id?: number }>;
  waitForTabComplete?: (tabId: number) => Promise<void>;
};

export function createChromeCaptureDeps(opts: ChromeCaptureDepsOptions): CaptureDeps {
  const createClient = opts.createClient ?? createWebApiClient;
  const api = createClient({
    baseUrl: opts.apiBaseUrl,
    getToken: opts.getToken,
  });
  const executeScript =
    opts.executeScript ??
    ((args) =>
      chrome.scripting.executeScript({
        target: args.target,
        func: args.func,
      }));

  return {
    queryTabs:
      opts.queryTabs ??
      (async () => {
        const tabs = await chrome.tabs.query({});
        return tabs.map((tab) => ({
          ...(tab.id !== undefined ? { id: tab.id } : {}),
          ...(tab.url !== undefined ? { url: tab.url } : {}),
        }));
      }),
    createTab:
      opts.createTab ??
      (async (url) => {
        const tab = await chrome.tabs.create({ url, active: false });
        return tab.id !== undefined ? { id: tab.id } : {};
      }),
    waitForTabComplete: opts.waitForTabComplete ?? createChromeWaitForTabComplete(),
    captureHtml: async (tabId) => {
      const results = await executeScript({
        target: { tabId },
        func: () => document.documentElement.outerHTML,
      });
      return readExecuteScriptHtml(results);
    },
    ingestHtml: async ({ konk, skuId, html, sourceUrl }): Promise<CaptureIngestResult> => {
      try {
        const result = await api.ingestHtml(konk, { skuId, html, sourceUrl });
        if (result.ok) {
          return {
            ok: true,
            status: result.status,
            productId: result.productId,
            stock: result.stock,
            price: result.price,
          };
        }
        return { ok: false, code: result.code, message: result.message };
      } catch (err) {
        return mapIngestClientError(err);
      }
    },
  };
}
