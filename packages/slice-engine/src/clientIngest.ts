import { parseSkuPage } from '@balloons/browser';
import {
  isInvalidSlicePoint,
  isValidSliceMetricValue,
  toOpenKyivSliceDate,
  toSliceDate,
  type CatalogStore,
  type SlicePoint,
  type SliceStore,
} from '@balloons/domain';
import { loadSlicedSkusForKonk } from './loadSlicedSkus.js';

export type ClientPendingItem = {
  skuId: string;
  productId: string;
  title: string;
  url: string;
};

export type ListPendingResult = {
  konkName: string;
  date: Date;
  items: ClientPendingItem[];
};

export type IngestHtmlInput = {
  konk: string;
  skuId: string;
  html: string;
  sourceUrl: string;
  catalog: CatalogStore;
  slices: SliceStore;
  now?: Date;
};

export type IngestHtmlResult =
  | {
      ok: true;
      status: 'saved' | 'skipped';
      date: Date;
      productId: string;
      stock: number;
      price: number;
    }
  | {
      ok: false;
      code:
        | 'SKU_NOT_FOUND'
        | 'KONK_MISMATCH'
        | 'NOT_SLICED'
        | 'URL_MISMATCH'
        | 'PARSE_FAILED'
        | 'NO_PRODUCT_ID';
      message: string;
    };

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

function urlsMatch(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}

/**
 * Sliced SKUs for `konk` missing a valid point on the open Kyiv slice day.
 */
export async function listPending(input: {
  konk: string;
  catalog: CatalogStore;
  slices: SliceStore;
  now?: Date;
}): Promise<ListPendingResult> {
  const date = toOpenKyivSliceDate(input.now ?? new Date());
  const skus = await loadSlicedSkusForKonk(input.catalog, input.konk);
  const items: ClientPendingItem[] = [];

  for (const sku of skus) {
    const point = await input.slices.getPoint(input.konk, sku.productId, date);
    if (!isInvalidSlicePoint(point)) continue;
    items.push({
      skuId: sku.id,
      productId: sku.productId,
      title: sku.title,
      url: sku.url,
    });
  }

  return { konkName: input.konk, date, items };
}

/**
 * Parse client HTML and fill the open slice day only when the point is missing/invalid.
 * Generic for any registered konk parser.
 */
export async function ingestHtml(input: IngestHtmlInput): Promise<IngestHtmlResult> {
  const sku = await input.catalog.getSkuById(input.skuId);
  if (!sku) {
    return { ok: false, code: 'SKU_NOT_FOUND', message: 'Sku not found' };
  }
  if (sku.konkName !== input.konk) {
    return { ok: false, code: 'KONK_MISMATCH', message: 'Sku competitor does not match konk' };
  }
  if (!sku.productId.trim()) {
    return { ok: false, code: 'NO_PRODUCT_ID', message: 'Sku has no productId' };
  }
  if (!urlsMatch(input.sourceUrl, sku.url)) {
    return { ok: false, code: 'URL_MISMATCH', message: 'sourceUrl does not match Sku.url' };
  }

  const sliced = await loadSlicedSkusForKonk(input.catalog, input.konk);
  if (!sliced.some((s) => s.id === sku.id)) {
    return { ok: false, code: 'NOT_SLICED', message: 'Sku is not in any sliced group' };
  }

  let parsed: { stock: number; price: number };
  try {
    parsed = parseSkuPage(input.html, {
      konk: input.konk,
      url: sku.url,
      productId: sku.productId,
    });
  } catch {
    return { ok: false, code: 'PARSE_FAILED', message: 'Failed to parse HTML' };
  }

  if (!isValidSliceMetricValue(parsed.stock) || !isValidSliceMetricValue(parsed.price)) {
    return { ok: false, code: 'PARSE_FAILED', message: 'Parsed stock/price invalid' };
  }

  const point: SlicePoint = { stock: parsed.stock, price: parsed.price };
  const date = toSliceDate(toOpenKyivSliceDate(input.now ?? new Date()));
  const existing = await input.slices.getPoint(input.konk, sku.productId, date);

  if (!isInvalidSlicePoint(existing)) {
    return {
      ok: true,
      status: 'skipped',
      date,
      productId: sku.productId,
      stock: existing!.stock,
      price: existing!.price,
    };
  }

  await input.slices.upsertPoint({
    konkName: input.konk,
    productId: sku.productId,
    date,
    point,
  });

  return {
    ok: true,
    status: 'saved',
    date,
    productId: sku.productId,
    stock: point.stock,
    price: point.price,
  };
}
