import * as cheerio from 'cheerio';

import type { ParseContext, SkuPageData } from '../../types.js';
import { parseMoney } from '../../util/parseMoney.js';
import { skuResult } from '../../util/result.js';

export function extractSharteCatalogProductId(html: string): string | undefined {
  const $ = cheerio.load(html);
  return $('#catalogElement').attr('data-product-id')?.trim() || undefined;
}

export function parseSharteHtmlPrice(html: string): number | undefined {
  const $ = cheerio.load(html);
  return parseMoney($('a.price.changePrice').first().text());
}

export function parseSharteAddCartJson(body: string): SkuPageData | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }

  const qty = Number(parsed.CATALOG_QUANTITY);
  const reserved = Number(parsed.CATALOG_QUANTITY_RESERVED ?? 0);
  if (!Number.isFinite(qty)) {
    return null;
  }

  const price = parseMoney(String(parsed['~PRICE'] ?? ''));
  if (price === undefined) {
    return null;
  }

  const available = qty - (Number.isFinite(reserved) ? reserved : 0);
  return skuResult(available, price, {
    productId: parsed.ID !== undefined ? String(parsed.ID) : undefined,
    title: typeof parsed['~NAME'] === 'string' ? parsed['~NAME'] : undefined,
  });
}

export function parseSharteSkuPageFallback(html: string, ctx: ParseContext): SkuPageData {
  void ctx;
  const productId = extractSharteCatalogProductId(html);
  const price = parseSharteHtmlPrice(html);
  if (price === undefined) {
    return skuResult(-1, -1, { productId });
  }
  return skuResult(0, price, { productId });
}

/** HTML-only path used by registry; cart path goes through fetchKonkPageData pipeline. */
export function parseSharteSkuPage(html: string, ctx: ParseContext): SkuPageData {
  return parseSharteSkuPageFallback(html, ctx);
}
