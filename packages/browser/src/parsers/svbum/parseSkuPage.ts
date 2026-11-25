import * as cheerio from 'cheerio';

import type { ParseContext, SkuPageData } from '../../types.js';
import { parseMoney, roundMoney } from '../../util/parseMoney.js';
import { skuResult } from '../../util/result.js';

function packFromText(text: string): number {
  const m = text.match(/\((\d+)\s*шт\)/i) || text.match(/(\d+)\s*шт/i);
  if (!m?.[1]) {
    return 1;
  }
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseSvbumSkuPage(html: string, ctx: ParseContext): SkuPageData {
  void ctx;
  const $ = cheerio.load(html);
  const root = $('#product');
  if (root.length === 0) {
    return skuResult(-1, -1);
  }

  const title = $('h1.page-title').first().text().trim() || undefined;
  let artikul: string | undefined;
  root.find('li').each((_, el) => {
    const text = $(el).text();
    if (/Артикул:/i.test(text)) {
      artikul = $(el).find('strong').text().trim() || text.replace(/.*Артикул:\s*/i, '').trim();
    }
  });

  const radios = root.find('.product-options-list input[type=radio][data-option-quantity]');
  if (radios.length > 0) {
    let stockSum = 0;
    let bestPrice: number | undefined;
    let allOos = true;
    let packSize = 1;

    radios.each((_, el) => {
      const input = $(el);
      const qty = Number(input.attr('data-option-quantity') ?? '0');
      const name = input.closest('label').find('.product-option--name').text() || title || '';
      const pack = packFromText(name);
      packSize = Math.max(packSize, pack);
      const unitPriceRaw =
        parseMoney(input.attr('data-special') ?? '') ?? parseMoney(input.attr('data-price') ?? '');
      if (unitPriceRaw === undefined) {
        return;
      }
      const unitPrice = roundMoney(unitPriceRaw / pack);
      if (qty > 0) {
        allOos = false;
        stockSum += qty * pack;
        if (bestPrice === undefined || unitPrice < bestPrice) {
          bestPrice = unitPrice;
        }
      } else if (allOos && (bestPrice === undefined || unitPrice < bestPrice)) {
        bestPrice = unitPrice;
      }
    });

    if (bestPrice === undefined) {
      return skuResult(-1, -1, { title, artikul });
    }

    return skuResult(allOos ? 0 : stockSum, bestPrice, {
      title,
      artikul,
      packSize: packSize > 1 ? packSize : undefined,
    });
  }

  const qtyEl = root.find('input[data-product-quantity]').first();
  const qty = Number(qtyEl.attr('data-product-quantity') ?? 'NaN');
  const priceNode = root.find('.product-control-price .price-new').first();
  const priceRaw =
    parseMoney(priceNode.find('[data-special]').attr('data-special') ?? '') ??
    parseMoney(priceNode.find('[data-price]').attr('data-price') ?? '') ??
    parseMoney(priceNode.text());

  if (!Number.isFinite(qty) || priceRaw === undefined) {
    return skuResult(-1, -1, { title, artikul });
  }

  const packSize = packFromText(title ?? '');
  return skuResult(qty * packSize, roundMoney(priceRaw / packSize), {
    title,
    artikul,
    packSize: packSize > 1 ? packSize : undefined,
  });
}
