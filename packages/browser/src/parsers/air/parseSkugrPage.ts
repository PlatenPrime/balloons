import * as cheerio from 'cheerio';

import type { ParseContext, SkugrPageData } from '../../types.js';
import { skugrProduct } from '../../util/result.js';

export function parseAirSkugrPage(html: string, ctx: ParseContext): SkugrPageData {
  void ctx;
  const $ = cheerio.load(html);
  const cards = $(
    '#us-category-products div.product-layout[data-pid], .us-category-products div.product-layout[data-pid], #content div.product-layout[data-pid]',
  );

  const products: SkugrPageData['products'] = [];
  cards.each((_, el) => {
    const node = $(el);
    const productId = node.attr('data-pid')?.trim();
    if (!productId) {
      return;
    }
    const title = node.find('.us-module-title a').first().text().trim() || undefined;
    const url =
      node.find('.us-module-img a[href]').attr('href') ||
      node.find('.us-module-title a[href]').attr('href') ||
      undefined;
    products.push(skugrProduct(productId, { url, title }));
  });

  return { products };
}
