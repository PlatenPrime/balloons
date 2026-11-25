import * as cheerio from 'cheerio';

import type { ParseContext, SkuPageData } from '../../types.js';
import { parseMoney, roundMoney } from '../../util/parseMoney.js';
import { skuResult } from '../../util/result.js';

function extractPackSize(title: string, $: ReturnType<typeof cheerio.load>): number {
  const fromTitle = title.match(/\((\d+)\s*шт\)/i) || title.match(/(\d+)\s*шт/i);
  if (fromTitle?.[1]) {
    const n = Number(fromTitle[1]);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  let pack = 1;
  $('#main dt, #main th').each((_, el) => {
    if (!/Штук в упаковці/i.test($(el).text())) {
      return;
    }
    const n = Number($(el).next('dd, td').text().replace(/\D/g, ''));
    if (Number.isFinite(n) && n > 0) {
      pack = n;
    }
  });
  return pack;
}

function displayPrice($: ReturnType<typeof cheerio.load>): number | undefined {
  return (
    parseMoney($('meta[property="product:price:amount"]').attr('content') ?? '') ??
    parseMoney($('[itemprop="price"]').attr('content') ?? '') ??
    parseMoney($('.current-price').first().text())
  );
}

export function isPerfectOosHtml(html: string): boolean {
  const $ = cheerio.load(html);
  const avail = $('meta[property="product:availability"]').attr('content') ?? '';
  if (/out_of_stock/i.test(avail)) {
    return true;
  }
  if ($('link[itemprop="availability"][href*="OutOfStock"]').length > 0) {
    return true;
  }
  const flags = $('.product-flags').text();
  return /розпродано/i.test(flags) || $('.product-flags .out-of-stock').length > 0;
}

export function tryPerfectDataProduct(html: string): SkuPageData | null {
  const $ = cheerio.load(html);
  const raw = $('#product-details').attr('data-product');
  if (!raw) {
    return null;
  }
  let data: {
    quantity?: number;
    price_amount?: number;
    price_tax_exc?: number;
    price_without_reduction?: number;
    name?: string;
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return null;
  }

  const qty = Number(data.quantity);
  const priceRaw = data.price_without_reduction ?? data.price_amount ?? data.price_tax_exc;
  if (!Number.isFinite(qty) || priceRaw === undefined) {
    return null;
  }

  const title = data.name ?? ($('h1').first().text().trim() || undefined);
  const artikul = $('.product-reference span').first().text().trim() || undefined;
  const packSize = extractPackSize(title ?? '', $);
  return skuResult(qty * packSize, roundMoney(Number(priceRaw) / packSize), {
    title,
    artikul,
    packSize: packSize > 1 ? packSize : undefined,
  });
}

export function parsePerfectHtmlOos(html: string, ctx: ParseContext): SkuPageData {
  void ctx;
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim() || undefined;
  const artikul = $('.product-reference span').first().text().trim() || undefined;
  const price = displayPrice($);
  if (price === undefined) {
    return skuResult(-1, -1, { title, artikul });
  }
  const packSize = extractPackSize(title ?? '', $);
  return skuResult(0, roundMoney(price / packSize), {
    title,
    artikul,
    packSize: packSize > 1 ? packSize : undefined,
  });
}

export function parsePerfectCartJson(body: string, html: string): SkuPageData | null {
  let parsed: {
    success?: boolean;
    cart?: {
      products?: Array<{
        stock_quantity?: number;
        price_without_reduction?: number;
        price?: number;
        name?: string;
        embedded_attributes?: {
          price_without_reduction?: number;
          price?: number;
          name?: string;
        };
      }>;
    };
  };
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    return null;
  }
  if (!parsed.success) {
    return null;
  }
  const product = parsed.cart?.products?.[0];
  if (!product) {
    return null;
  }

  const qty = Number(product.stock_quantity);
  const priceRaw =
    product.price_without_reduction ??
    product.embedded_attributes?.price_without_reduction ??
    product.embedded_attributes?.price ??
    product.price;
  if (!Number.isFinite(qty) || priceRaw === undefined) {
    return null;
  }

  const $ = cheerio.load(html);
  const title =
    product.name || product.embedded_attributes?.name || $('h1').first().text().trim() || undefined;
  const artikul = $('.product-reference span').first().text().trim() || undefined;
  const packSize = extractPackSize(title ?? '', $);

  return skuResult(qty * packSize, roundMoney(Number(priceRaw) / packSize), {
    title,
    artikul,
    packSize: packSize > 1 ? packSize : undefined,
  });
}

/** Registry HTML path: data-product → OOS html → invalid. */
export function parsePerfectSkuPage(html: string, ctx: ParseContext): SkuPageData {
  const fromData = tryPerfectDataProduct(html);
  if (fromData) {
    return fromData;
  }
  if (isPerfectOosHtml(html)) {
    return parsePerfectHtmlOos(html, ctx);
  }
  return skuResult(-1, -1);
}
