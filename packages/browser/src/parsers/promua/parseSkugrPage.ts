import * as cheerio from 'cheerio';

import type { ParseContext, SkugrPageData } from '../../types.js';
import { skugrProduct } from '../../util/result.js';

/** Shared Prom.ua company-site listing (balun / dojdevik). */
export function parsePromUaSkugrPage(html: string, ctx: ParseContext): SkugrPageData {
  void ctx;
  const $ = cheerio.load(html);
  const products: SkugrPageData['products'] = [];
  const seen = new Set<string>();

  $('button[data-qaid="buy-button"][data-product-id]').each((_, el) => {
    const btn = $(el);
    const productId = btn.attr('data-product-id')?.trim();
    if (!productId || seen.has(productId)) {
      return;
    }
    seen.add(productId);
    products.push(
      skugrProduct(productId, {
        url: btn.attr('data-product-url') || undefined,
        title: btn.attr('data-product-name') || undefined,
      }),
    );
  });

  $('li[data-qaid="product-block"][data-product-id]').each((_, el) => {
    const block = $(el);
    const productId = block.attr('data-product-id')?.trim();
    if (!productId || seen.has(productId)) {
      return;
    }
    seen.add(productId);
    products.push(
      skugrProduct(productId, {
        url: block.find('a.b-product-gallery__image-link').attr('href') || undefined,
        title: block.find('a.b-product-gallery__title').text().trim() || undefined,
      }),
    );
  });

  return { products };
}
