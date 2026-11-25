import type { ParseContext, SkugrPageData } from '../../types.js';
import { skugrProduct } from '../../util/result.js';

type YuminListingJson = {
  data?: Array<{
    id?: number | string;
    name?: string;
    url_key?: string;
  }>;
};

/** Yumin SKUGR is a JSON listing page (fixture file may be .json or HTML wrapping JSON). */
export function parseYuminSkugrPage(raw: string, ctx: ParseContext): SkugrPageData {
  void ctx;
  const trimmed = raw.trim();
  let jsonText = trimmed;
  if (trimmed.startsWith('<')) {
    const match = trimmed.match(
      /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
    );
    if (match?.[1]) {
      jsonText = match[1].trim();
    }
  }

  let parsed: YuminListingJson;
  try {
    parsed = JSON.parse(jsonText) as YuminListingJson;
  } catch {
    return { products: [] };
  }

  const products: SkugrPageData['products'] = [];
  for (const item of parsed.data ?? []) {
    if (item.id === undefined || item.id === null) {
      continue;
    }
    const productId = String(item.id);
    const url = item.url_key ? `https://yumi.market/${item.url_key}` : undefined;
    products.push(skugrProduct(productId, { url, title: item.name }));
  }

  return { products };
}
