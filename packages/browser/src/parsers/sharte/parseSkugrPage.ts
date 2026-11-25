import * as cheerio from 'cheerio';

import type { ParseContext, SkugrPageData } from '../../types.js';
import { skugrProduct } from '../../util/result.js';

export function parseSharteSkugrPage(html: string, ctx: ParseContext): SkugrPageData {
  void ctx;
  const $ = cheerio.load(html);
  const products: SkugrPageData['products'] = [];

  $('.items.productList .item.product.sku[data-product-id]').each((_, el) => {
    const item = $(el);
    const productId = item.attr('data-product-id')?.trim();
    if (!productId) {
      return;
    }
    const title =
      item.find('a.name .middle').text().trim() ||
      item.find('a.picture img').attr('alt')?.trim() ||
      undefined;
    const url =
      item.find('a.picture[href]').attr('href') ||
      item.find('a.name[href]').attr('href') ||
      undefined;
    products.push(skugrProduct(productId, { url, title }));
  });

  return { products };
}
