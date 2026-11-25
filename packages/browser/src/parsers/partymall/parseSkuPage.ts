import * as cheerio from 'cheerio';

import type { ParseContext, SkuPageData } from '../../types.js';
import { parseMoney, roundMoney } from '../../util/parseMoney.js';
import { skuResult } from '../../util/result.js';

export function parsePartymallSkuPage(html: string, ctx: ParseContext): SkuPageData {
  void ctx;
  const $ = cheerio.load(html);
  const root = $('#product');
  if (root.length === 0) {
    return skuResult(-1, -1);
  }

  const title =
    root.find('h1').first().text().trim() ||
    $('.ds-page-title h1').first().text().trim() ||
    undefined;

  const artikul = root.find('span[id^="product-model-"]').first().text().trim() || undefined;

  let packSize = 1;
  root.find('.ds-product-attributes-item').each((_, el) => {
    const label = $(el).find('.secondary-text').text().toLowerCase();
    if (label.includes('кількість в упаковці')) {
      const n = Number($(el).find('.fw-500').text().replace(/\D/g, ''));
      if (Number.isFinite(n) && n > 0) {
        packSize = n;
      }
    }
  });

  const stockEl = root.find('.ds-product-main-stock').first();
  const stockText = stockEl.text();
  const isOos = stockEl.hasClass('red-text') || /немає в наявності|нет в наличии/i.test(stockText);

  let stock = 0;
  if (!isOos) {
    const m = stockText.match(/:\s*(\d+)/) || stockText.match(/(\d+)\s*$/);
    stock = m?.[1] ? Number(m[1]) : 0;
  }

  const priceRaw = parseMoney(root.find('.ds-product-main-price .ds-price-new').first().text());
  if (priceRaw === undefined) {
    return skuResult(-1, -1, { title, artikul });
  }

  return skuResult(isOos ? 0 : stock * packSize, roundMoney(priceRaw / packSize), {
    title,
    artikul,
    packSize: packSize > 1 ? packSize : undefined,
  });
}
