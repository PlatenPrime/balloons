import * as cheerio from 'cheerio';

import type { ParseContext, SkugrPageData } from '../../types.js';
import { skugrProduct } from '../../util/result.js';

function productIdFromUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  const m = url.match(/\/(\d+)-[^/]+\.html/i);
  return m?.[1];
}

export function parsePerfectSkugrPage(html: string, ctx: ParseContext): SkugrPageData {
  void ctx;
  const $ = cheerio.load(html);
  const products: SkugrPageData['products'] = [];

  $('article.product-miniature.js-product-miniature[data-id-product]').each((_, el) => {
    const art = $(el);
    const fromAttr = art.attr('data-id-product')?.trim();
    const url = art.find('a.thumbnail.product-thumbnail').attr('href') || undefined;
    const productId = fromAttr || productIdFromUrl(url);
    if (!productId) {
      return;
    }
    const img = art.find('a.thumbnail.product-thumbnail img').first();
    products.push(
      skugrProduct(productId, {
        url,
        title: img.attr('alt')?.trim() || img.attr('title')?.trim() || undefined,
      }),
    );
  });

  return { products };
}
