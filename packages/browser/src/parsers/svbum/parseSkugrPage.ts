import * as cheerio from 'cheerio';

import type { ParseContext, SkugrPageData } from '../../types.js';
import { skugrProduct } from '../../util/result.js';

export function parseSvbumSkugrPage(html: string, ctx: ParseContext): SkugrPageData {
  void ctx;
  const $ = cheerio.load(html);
  const products: SkugrPageData['products'] = [];

  $('li.product-layout .product-thumb').each((_, el) => {
    const thumb = $(el);
    const productId = thumb.find('button[data-p_id]').attr('data-p_id')?.trim();
    if (!productId) {
      return;
    }
    const link = thumb.find('.product-title a').first();
    products.push(
      skugrProduct(productId, {
        url: link.attr('href') || undefined,
        title: link.text().trim() || undefined,
      }),
    );
  });

  return { products };
}
