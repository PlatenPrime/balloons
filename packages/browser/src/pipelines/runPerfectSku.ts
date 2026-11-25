import type { HttpLike } from '../pipeline/httpLike.js';
import {
  isPerfectOosHtml,
  parsePerfectCartJson,
  parsePerfectHtmlOos,
  tryPerfectDataProduct,
} from '../parsers/perfect/parseSkuPage.js';
import type { ParseContext, SkuPageData } from '../types.js';
import { INVALID_STOCK_PRICE } from '../types.js';

export async function runPerfectSku(
  url: string,
  transport: HttpLike,
  ctx: ParseContext,
): Promise<SkuPageData> {
  const htmlRes = await transport.request({ stageKey: 'fetchHtml', url });
  const html = htmlRes.body;

  const fromData = tryPerfectDataProduct(html);
  if (fromData) {
    return fromData;
  }

  if (isPerfectOosHtml(html)) {
    return parsePerfectHtmlOos(html, ctx);
  }

  try {
    const cartRes = await transport.request({ stageKey: 'addToCart', method: 'POST' });
    if (cartRes.status < 400) {
      const fromCart = parsePerfectCartJson(cartRes.body, html);
      if (fromCart) {
        return fromCart;
      }
    }
  } catch {
    /* fall through */
  }

  if (isPerfectOosHtml(html)) {
    return parsePerfectHtmlOos(html, ctx);
  }

  return { ...INVALID_STOCK_PRICE };
}
