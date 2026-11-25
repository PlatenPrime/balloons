import type { HttpLike } from '../pipeline/httpLike.js';
import { StageError } from '../pipeline/stageError.js';
import {
  extractSharteCatalogProductId,
  parseSharteAddCartJson,
  parseSharteSkuPageFallback,
} from '../parsers/sharte/parseSkuPage.js';
import type { ParseContext, SkuPageData } from '../types.js';
import { skuResult } from '../util/result.js';

export async function runSharteSku(
  url: string,
  transport: HttpLike,
  ctx: ParseContext,
): Promise<SkuPageData> {
  const htmlRes = await transport.request({ stageKey: 'fetchHtml', url });
  const html = htmlRes.body;
  const productId = extractSharteCatalogProductId(html);
  if (!productId) {
    throw new StageError(
      'sharte',
      'extractCatalogProductId',
      'Missing #catalogElement[data-product-id]',
    );
  }

  try {
    const cartRes = await transport.request({ stageKey: 'addToCart', method: 'POST' });
    if (cartRes.status >= 400) {
      return parseSharteSkuPageFallback(html, ctx);
    }
    const parsed = parseSharteAddCartJson(cartRes.body);
    if (!parsed) {
      return parseSharteSkuPageFallback(html, ctx);
    }
    return skuResult(parsed.stock, parsed.price, {
      productId: parsed.productId ?? productId,
      title: parsed.title,
      artikul: parsed.artikul,
      packSize: parsed.packSize,
    });
  } catch (err) {
    if (err instanceof StageError && err.stage === 'addToCart') {
      return parseSharteSkuPageFallback(html, ctx);
    }
    throw err;
  }
}
