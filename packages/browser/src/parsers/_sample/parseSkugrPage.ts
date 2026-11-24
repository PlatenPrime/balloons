import * as cheerio from 'cheerio';

import type { ParseContext, ParsedSkugrPage } from '../../types.js';

export function parseSampleSkugrPage(html: string, ctx: ParseContext): ParsedSkugrPage {
  void ctx;
  const $ = cheerio.load(html);
  const products: ParsedSkugrPage['products'] = [];

  $('[data-product-id]').each((_, node) => {
    const el = $(node);
    const productId = el.attr('data-product-id')?.trim();
    if (!productId) {
      return;
    }
    const url = el.attr('data-url')?.trim();
    products.push(url ? { productId, url } : { productId });
  });

  return { products };
}
