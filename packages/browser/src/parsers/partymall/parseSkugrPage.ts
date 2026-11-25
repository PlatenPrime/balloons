import * as cheerio from 'cheerio';

import type { ParseContext, SkugrPageData } from '../../types.js';
import { skugrProduct } from '../../util/result.js';

export function parsePartymallSkugrPage(html: string, ctx: ParseContext): SkugrPageData {
  void ctx;
  const $ = cheerio.load(html);
  if ($('.error-404-wrapper').length > 0) {
    return { products: [] };
  }

  const products: SkugrPageData['products'] = [];
  $('.ds-category-products .ds-module-item[data-pid]').each((_, el) => {
    const node = $(el);
    const productId = node.attr('data-pid')?.trim();
    if (!productId || productId === '0000') {
      return;
    }
    const link = node.find('a.ds-module-title').first();
    products.push(
      skugrProduct(productId, {
        url: link.attr('href') || undefined,
        title: link.text().trim() || undefined,
      }),
    );
  });

  return { products };
}
