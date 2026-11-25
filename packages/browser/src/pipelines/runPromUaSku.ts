import type { HttpLike } from '../pipeline/httpLike.js';
import { StageError } from '../pipeline/stageError.js';
import {
  normalizeBalunOutcome,
  normalizeDojdevikOutcome,
  parsePromUaAddCartResponse,
  parsePromUaClampResponse,
  type PromUaCartOutcome,
} from '../parsers/promua/parseCartGraphql.js';
import {
  parseBalunHtmlContext,
  parseDojdevikHtmlContext,
  type PromUaHtmlContext,
} from '../parsers/promua/parseHtmlContext.js';
import type { SkuPageData } from '../types.js';

async function runPromUaSkuPipeline(options: {
  konk: 'balun' | 'dojdevik';
  url: string;
  transport: HttpLike;
  parseHtml: (html: string) => PromUaHtmlContext;
  normalize: (ctx: PromUaHtmlContext, cart: PromUaCartOutcome) => SkuPageData;
}): Promise<SkuPageData> {
  const { konk, transport, parseHtml, normalize } = options;

  const htmlRes = await transport.request({ stageKey: 'fetchHtml', url: options.url });
  const htmlCtx = parseHtml(htmlRes.body);
  if (!htmlCtx.csrfToken) {
    throw new StageError(konk, 'extractCsrf', 'CSRF token missing in HTML fixture');
  }

  const addRes = await transport.request({ stageKey: 'addToCart', method: 'POST' });
  const add = parsePromUaAddCartResponse(addRes.body);
  if (add.notOrderable) {
    const cart: PromUaCartOutcome = { packs: 0, notOrderable: true, failed: false };
    if (add.unitPrice !== undefined) {
      cart.unitPrice = add.unitPrice;
    }
    return normalize(htmlCtx, cart);
  }
  if (add.failed) {
    throw new StageError(konk, 'addToCart', 'AddProductToCart failed or unexpected typename');
  }

  const clampRes = await transport.request({ stageKey: 'clampQty', method: 'POST' });
  const clamp = parsePromUaClampResponse(clampRes.body);
  if (clamp.failed) {
    throw new StageError(konk, 'clampQty', 'CartChangeProductQuantity probe failed');
  }

  return normalize(htmlCtx, clamp);
}

export function runBalunSku(url: string, transport: HttpLike): Promise<SkuPageData> {
  return runPromUaSkuPipeline({
    konk: 'balun',
    url,
    transport,
    parseHtml: parseBalunHtmlContext,
    normalize: normalizeBalunOutcome,
  });
}

export function runDojdevikSku(url: string, transport: HttpLike): Promise<SkuPageData> {
  return runPromUaSkuPipeline({
    konk: 'dojdevik',
    url,
    transport,
    parseHtml: parseDojdevikHtmlContext,
    normalize: normalizeDojdevikOutcome,
  });
}
