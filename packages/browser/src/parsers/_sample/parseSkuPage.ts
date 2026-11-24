import * as cheerio from 'cheerio';

import type { ParseContext, ParsedSkuPage } from '../../types.js';

export function parseSampleSkuPage(html: string, ctx: ParseContext): ParsedSkuPage {
  void ctx;
  const $ = cheerio.load(html);
  const el = $('[data-stock][data-price]').first();
  if (el.length === 0) {
    throw new Error('_sample sku-page: missing [data-stock][data-price]');
  }

  const stock = Number(el.attr('data-stock'));
  const price = Number(el.attr('data-price'));
  if (!Number.isFinite(stock) || !Number.isFinite(price)) {
    throw new Error('_sample sku-page: stock/price are not finite numbers');
  }

  return { stock, price };
}
