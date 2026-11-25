import * as cheerio from 'cheerio';

import type { ParseContext, SkuPageData } from '../../types.js';
import { parseMoney, roundMoney } from '../../util/parseMoney.js';
import { skuResult } from '../../util/result.js';

function extractPieceCount(title: string): number {
  const m = title.match(/\((\d+)\s*шт\)/i);
  if (!m?.[1]) {
    return 1;
  }
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseYuminSkuPage(html: string, ctx: ParseContext): SkuPageData {
  void ctx;
  const flatQtyMatch = html.match(/:flat-qty="(\d+)"/);
  const initialPriceMatch = html.match(/:initial-price="([\d.]+)"/);
  if (!flatQtyMatch?.[1] || !initialPriceMatch?.[1]) {
    return skuResult(-1, -1);
  }

  const flatQty = Number(flatQtyMatch[1]);
  let basePrice = Number(initialPriceMatch[1]);
  if (!Number.isFinite(flatQty) || !Number.isFinite(basePrice)) {
    return skuResult(-1, -1);
  }

  const wholesaleRe = /Від\s+(\d+)\s*шт\.?\s*<\/p>\s*<p[^>]*>([^<]*)<\/p>/gi;
  let wm: RegExpExecArray | null;
  while ((wm = wholesaleRe.exec(html)) !== null) {
    const wp = parseMoney(wm[2] ?? '');
    if (wp !== undefined && wp < basePrice) {
      basePrice = wp;
    }
  }

  const $ = cheerio.load(html);
  const title =
    $('h1.text-3xl').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    undefined;

  let artikul: string | undefined;
  $('span').each((_, el) => {
    if (artikul) {
      return;
    }
    const text = $(el).text().trim();
    if (text === 'Артикул:' || text.startsWith('Артикул')) {
      const next = $(el).next('span').text().trim();
      if (next) {
        artikul = next;
      }
    }
  });

  const packSize = extractPieceCount(title ?? '');
  return skuResult(flatQty * packSize, roundMoney(basePrice / packSize), {
    title,
    artikul,
    packSize: packSize > 1 ? packSize : undefined,
  });
}
