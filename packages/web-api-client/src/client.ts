import type { z } from 'zod';
import {
  bandSpikeCorrectRequestSchema,
  bandSpikeDiscoverRequestSchema,
  createExcelJobRequestSchema,
  createSliceJobRequestSchema,
  dayMetaResponseSchema,
  dayPointsResponseSchema,
  excelJobSchema,
  healthResponseSchema,
  ingestHtmlRequestSchema,
  ingestHtmlResponseSchema,
  konkSchema,
  listKonksResponseSchema,
  listProdsResponseSchema,
  listSkusResponseSchema,
  listSkugrsResponseSchema,
  listStockBandsResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  meResponseSchema,
  packFlipRangeRequestSchema,
  parseSkuPageRequestSchema,
  parseSkugrPageRequestSchema,
  pendingResponseSchema,
  prodSchema,
  seedKonkRequestSchema,
  seedProdRequestSchema,
  seedSkuRequestSchema,
  seedSkugrRequestSchema,
  seedStockBandRequestSchema,
  skuSchema,
  skugrSchema,
  sliceJobSchema,
  slicePointSchema,
  stockBandBatchCorrectRequestSchema,
  stockBandDiscoverRequestSchema,
  stockBandSchema,
  updateStockBandRequestSchema,
  upsertDayMetaRequestSchema,
  upsertPointRequestSchema,
} from './schemas/index.js';

export type WebApiClientOptions = {
  baseUrl: string;
  getToken?: () => string | null | undefined;
  fetch?: typeof fetch;
};

export class WebApiClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'WebApiClientError';
    this.status = status;
    this.body = body;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function createWebApiClient(options: WebApiClientOptions) {
  const fetcher = options.fetch ?? fetch;

  async function request<T>(
    method: string,
    path: string,
    opts?: {
      body?: unknown;
      query?: Record<string, string | undefined>;
      schema?: z.ZodType<T>;
      auth?: boolean;
      raw?: boolean;
    },
  ): Promise<T> {
    const url = new URL(joinUrl(options.baseUrl, path));
    if (opts?.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {};
    if (opts?.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (opts?.auth !== false) {
      const token = options.getToken?.();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    const init: RequestInit = { method, headers };
    if (opts?.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetcher(url, init);

    if (opts?.raw) {
      if (!res.ok) {
        throw new WebApiClientError(`HTTP ${res.status}`, res.status, await res.text());
      }
      return res as unknown as T;
    }

    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        json && typeof json === 'object' && json !== null && 'error' in json
          ? String((json as { error: unknown }).error)
          : `HTTP ${res.status}`;
      throw new WebApiClientError(msg, res.status, json);
    }

    if (opts?.schema) {
      return opts.schema.parse(json);
    }
    return json as T;
  }

  return {
    health: () => request('GET', '/health', { schema: healthResponseSchema, auth: false }),

    login: async (body: z.input<typeof loginRequestSchema>) => {
      const parsed = loginRequestSchema.parse(body);
      return request('POST', '/auth/login', {
        body: parsed,
        schema: loginResponseSchema,
        auth: false,
      });
    },

    me: () => request('GET', '/auth/me', { schema: meResponseSchema }),

    listKonks: () => request('GET', '/catalog/konks', { schema: listKonksResponseSchema }),
    getKonk: (name: string) =>
      request('GET', `/catalog/konks/${encodeURIComponent(name)}`, { schema: konkSchema }),
    seedKonk: (body: z.input<typeof seedKonkRequestSchema>) =>
      request('POST', '/catalog/konks', {
        body: seedKonkRequestSchema.parse(body),
        schema: konkSchema,
      }),

    listProds: () => request('GET', '/catalog/prods', { schema: listProdsResponseSchema }),
    getProd: (name: string) =>
      request('GET', `/catalog/prods/${encodeURIComponent(name)}`, { schema: prodSchema }),
    seedProd: (body: z.input<typeof seedProdRequestSchema>) =>
      request('POST', '/catalog/prods', {
        body: seedProdRequestSchema.parse(body),
        schema: prodSchema,
      }),

    listSkus: (query?: { konkName?: string; isInvalid?: boolean }) =>
      request('GET', '/catalog/skus', {
        query: {
          konkName: query?.konkName,
          isInvalid: query?.isInvalid === undefined ? undefined : String(query.isInvalid),
        },
        schema: listSkusResponseSchema,
      }),
    getSku: (id: string) =>
      request('GET', `/catalog/skus/${encodeURIComponent(id)}`, { schema: skuSchema }),
    seedSku: (body: z.input<typeof seedSkuRequestSchema>) =>
      request('POST', '/catalog/skus', {
        body: seedSkuRequestSchema.parse(body),
        schema: skuSchema,
      }),

    listSkugrs: (query?: { konkName?: string; isSliced?: boolean }) =>
      request('GET', '/catalog/skugrs', {
        query: {
          konkName: query?.konkName,
          isSliced: query?.isSliced === undefined ? undefined : String(query.isSliced),
        },
        schema: listSkugrsResponseSchema,
      }),
    getSkugr: (id: string) =>
      request('GET', `/catalog/skugrs/${encodeURIComponent(id)}`, { schema: skugrSchema }),
    seedSkugr: (body: z.input<typeof seedSkugrRequestSchema>) =>
      request('POST', '/catalog/skugrs', {
        body: seedSkugrRequestSchema.parse(body),
        schema: skugrSchema,
      }),

    listStockBands: (query?: { konkName?: string }) =>
      request('GET', '/catalog/stock-bands', {
        query: { konkName: query?.konkName },
        schema: listStockBandsResponseSchema,
      }),
    getStockBand: (id: string) =>
      request('GET', `/catalog/stock-bands/${encodeURIComponent(id)}`, {
        schema: stockBandSchema,
      }),
    seedStockBand: (body: z.input<typeof seedStockBandRequestSchema>) =>
      request('POST', '/catalog/stock-bands', {
        body: seedStockBandRequestSchema.parse(body),
        schema: stockBandSchema,
      }),
    updateStockBand: (id: string, body: z.input<typeof updateStockBandRequestSchema>) =>
      request('PUT', `/catalog/stock-bands/${encodeURIComponent(id)}`, {
        body: updateStockBandRequestSchema.parse(body),
        schema: stockBandSchema,
      }),
    deleteStockBand: async (id: string): Promise<{ ok: true }> =>
      request('DELETE', `/catalog/stock-bands/${encodeURIComponent(id)}`),

    discoverStockBand: (body: z.input<typeof stockBandDiscoverRequestSchema>) =>
      request('POST', '/catalog/stock-bands/discover', {
        body: stockBandDiscoverRequestSchema.parse(body),
      }),
    batchCorrectStockBand: (body: z.input<typeof stockBandBatchCorrectRequestSchema>) =>
      request('POST', '/catalog/stock-bands/batch-correct', {
        body: stockBandBatchCorrectRequestSchema.parse(body),
        schema: sliceJobSchema,
      }),

    getDayMeta: (konk: string, date: string) =>
      request('GET', `/slices/${encodeURIComponent(konk)}/days/${encodeURIComponent(date)}/meta`, {
        schema: dayMetaResponseSchema,
      }),
    putDayMeta: (konk: string, date: string, body: z.input<typeof upsertDayMetaRequestSchema>) =>
      request('PUT', `/slices/${encodeURIComponent(konk)}/days/${encodeURIComponent(date)}/meta`, {
        body: upsertDayMetaRequestSchema.parse(body),
        schema: dayMetaResponseSchema,
      }),
    listDayPoints: (konk: string, date: string) =>
      request(
        'GET',
        `/slices/${encodeURIComponent(konk)}/days/${encodeURIComponent(date)}/points`,
        { schema: dayPointsResponseSchema },
      ),
    putPoint: (konk: string, productId: string, body: z.input<typeof upsertPointRequestSchema>) =>
      request(
        'PUT',
        `/slices/${encodeURIComponent(konk)}/points/${encodeURIComponent(productId)}`,
        {
          body: upsertPointRequestSchema.parse(body),
          schema: slicePointSchema,
        },
      ),
    listPending: (konk: string) =>
      request('GET', `/slices/${encodeURIComponent(konk)}/pending`, {
        schema: pendingResponseSchema,
      }),
    ingestHtml: (konk: string, body: z.input<typeof ingestHtmlRequestSchema>) =>
      request('POST', `/slices/${encodeURIComponent(konk)}/ingest`, {
        body: ingestHtmlRequestSchema.parse(body),
        schema: ingestHtmlResponseSchema,
      }),

    createSliceJob: (body: z.input<typeof createSliceJobRequestSchema>) =>
      request('POST', '/slice-jobs', {
        body: createSliceJobRequestSchema.parse(body),
        schema: sliceJobSchema,
      }),
    listSliceJobs: () => request<{ items: z.infer<typeof sliceJobSchema>[] }>('GET', '/slice-jobs'),
    getSliceJob: (id: string) =>
      request('GET', `/slice-jobs/${encodeURIComponent(id)}`, { schema: sliceJobSchema }),
    cancelSliceJob: (id: string) =>
      request('POST', `/slice-jobs/${encodeURIComponent(id)}/cancel`, {
        schema: sliceJobSchema,
      }),

    previewPackFlips: (body: z.input<typeof packFlipRangeRequestSchema>) =>
      request('POST', '/corrections/pack-flips/preview', {
        body: packFlipRangeRequestSchema.parse(body),
      }),
    applyPackFlips: (body: z.input<typeof packFlipRangeRequestSchema>) =>
      request('POST', '/corrections/pack-flips/apply', {
        body: packFlipRangeRequestSchema.parse(body),
      }),
    discoverBandSpike: (body: z.input<typeof bandSpikeDiscoverRequestSchema>) =>
      request('POST', '/corrections/band-spike/discover', {
        body: bandSpikeDiscoverRequestSchema.parse(body),
      }),
    correctBandSpike: (body: z.input<typeof bandSpikeCorrectRequestSchema>) =>
      request('POST', '/corrections/band-spike/correct', {
        body: bandSpikeCorrectRequestSchema.parse(body),
      }),

    reportSkuByDate: (query: { skuId: string; date: string }) =>
      request('GET', '/reports/sku-by-date', { query }),
    reportSkuRange: (query: { skuId: string; dateFrom: string; dateTo: string }) =>
      request('GET', '/reports/sku-range', { query }),
    reportSkugrDaily: (query: { skugrId: string; dateFrom: string; dateTo: string }) =>
      request('GET', '/reports/skugr-daily', { query }),
    reportSkugrSkusSales: (query: { skugrId: string; dateFrom: string; dateTo: string }) =>
      request('GET', '/reports/skugr-skus-sales', { query }),
    reportKonkProdGroups: (query: {
      konk: string;
      prod: string;
      dateFrom: string;
      dateTo: string;
    }) => request('GET', '/reports/konk-prod-groups', { query }),
    reportStockSeries: (query: {
      konk: string;
      prod: string;
      dateFrom: string;
      dateTo: string;
      skugrIds?: string;
    }) => request('GET', '/reports/stock-series', { query }),
    reportSalesSeries: (query: {
      konk: string;
      prod: string;
      dateFrom: string;
      dateTo: string;
      skugrIds?: string;
    }) => request('GET', '/reports/sales-series', { query }),
    reportManufacturersPie: (query: { konk: string; dateFrom: string; dateTo: string }) =>
      request('GET', '/reports/manufacturers-pie', { query }),
    reportProdKonksPie: (query: {
      prod: string;
      dateFrom: string;
      dateTo: string;
      excludeKonks?: string;
    }) => request('GET', '/reports/prod-konks-pie', { query }),
    reportSelectionPie: (query: Record<string, string | undefined>) =>
      request('GET', '/reports/selection-pie', { query }),

    createExcelJob: (body: z.input<typeof createExcelJobRequestSchema>) =>
      request('POST', '/excel-jobs', {
        body: createExcelJobRequestSchema.parse(body),
        schema: excelJobSchema,
      }),
    listExcelJobs: () => request<{ items: z.infer<typeof excelJobSchema>[] }>('GET', '/excel-jobs'),
    getExcelJob: (id: string) =>
      request('GET', `/excel-jobs/${encodeURIComponent(id)}`, { schema: excelJobSchema }),
    cancelExcelJob: (id: string) =>
      request('POST', `/excel-jobs/${encodeURIComponent(id)}/cancel`, {
        schema: excelJobSchema,
      }),
    getExcelFile: (id: string) =>
      request<Response>('GET', `/excel-jobs/${encodeURIComponent(id)}/file`, { raw: true }),

    parseSkuPage: (body: z.input<typeof parseSkuPageRequestSchema>) =>
      request('POST', '/browser-debug/parse-sku', {
        body: parseSkuPageRequestSchema.parse(body),
      }),
    parseSkugrPage: (body: z.input<typeof parseSkugrPageRequestSchema>) =>
      request('POST', '/browser-debug/parse-skugr', {
        body: parseSkugrPageRequestSchema.parse(body),
      }),
  };
}

export type WebApiClient = ReturnType<typeof createWebApiClient>;
