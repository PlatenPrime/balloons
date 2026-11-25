import * as cheerio from 'cheerio';

import type { ParseContext, SkuPageData } from '../../types.js';
import { parseMoney } from '../../util/parseMoney.js';
import { skuResult } from '../../util/result.js';

export function parseAirSkuPage(html: string, ctx: ParseContext): SkuPageData {
  void ctx;
  const $ = cheerio.load(html);
  const qtyRaw = $('#max-product-quantity').attr('value');
  const stock =
    qtyRaw === undefined || qtyRaw.trim() === '' ? 0 : Number(qtyRaw.replace(/\s/g, ''));

  const priceText = $('.us-price-actual').first().text() || $('.us-price-new').first().text() || '';
  const price = parseMoney(priceText);
  const artikul = $('.us-product-info-code').first().text().trim() || undefined;

  if (!Number.isFinite(stock) || price === undefined) {
    return skuResult(-1, -1, { artikul });
  }

  return skuResult(stock, price, { artikul });
}
