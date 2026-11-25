import * as cheerio from 'cheerio';

import { parseMoney } from '../../util/parseMoney.js';

export type PromUaHtmlContext = {
  htmlPrice?: number;
  artikul?: string;
  title?: string;
  packSize: number;
  csrfToken?: string;
};

function assignOptional<T extends object>(
  target: T,
  key: keyof T,
  value: T[keyof T] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

export function extractPromUaProductId(url: string): string | undefined {
  const m = url.match(/\/p(\d+)/i);
  return m?.[1];
}

export function extractPromUaCsrfToken(html: string): string | undefined {
  const $ = cheerio.load(html);
  const meta =
    $('meta[name="csrf-token"]').attr('content') || $('meta[name="csrfToken"]').attr('content');
  if (meta) {
    return meta.trim();
  }
  const cookieMatch = html.match(/csrf_token_company_site=([^;"\s]+)/);
  return cookieMatch?.[1];
}

export function parseBalunHtmlContext(html: string): PromUaHtmlContext {
  const $ = cheerio.load(html);
  let htmlPrice: number | undefined;
  $('[data-analytics]').each((_, el) => {
    if (htmlPrice !== undefined) {
      return;
    }
    const raw = $(el).attr('data-analytics');
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { clerk?: { price_original?: string } };
      htmlPrice = parseMoney(parsed.clerk?.price_original ?? '');
    } catch {
      /* ignore */
    }
  });

  const code = $('[data-qaid="product_code"]').first();
  const artikul = code.attr('title')?.trim() || code.text().trim() || undefined;
  const out: PromUaHtmlContext = { packSize: 1 };
  assignOptional(out, 'htmlPrice', htmlPrice);
  assignOptional(out, 'artikul', artikul);
  assignOptional(out, 'csrfToken', extractPromUaCsrfToken(html));
  return out;
}

function extractDojdevikPackCount($: ReturnType<typeof cheerio.load>, title: string): number {
  let pack = 1;
  $('[data-qaid="attribute_name"]').each((_, el) => {
    const name = $(el).text().trim();
    if (/коробц/i.test(name)) {
      return;
    }
    if (!/пачц[іи]|упаковц[іи]|набор[іи]/i.test(name)) {
      return;
    }
    const valueEl = $(el).closest('tr, div').find('[data-qaid="attribute_value"]').first();
    const n = Number((valueEl.text() || '').replace(/\D/g, ''));
    if (Number.isFinite(n) && n > 0) {
      pack = n;
    }
  });

  if (pack === 1) {
    const m = title.match(/\((\d+)\s*шт\)/i) || title.match(/по\s+(\d+)\s+штук/i);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) {
        pack = n;
      }
    }
  }

  return pack;
}

export function parseDojdevikHtmlContext(html: string): PromUaHtmlContext {
  const $ = cheerio.load(html);
  const title = $('[data-qaid="product_name"]').first().text().trim() || undefined;
  const priceEl = $('[data-qaid="product_price"]').first();
  const htmlPrice = parseMoney(priceEl.attr('data-qaprice') ?? '') ?? parseMoney(priceEl.text());
  const code = $('[data-qaid="product_code"]').first();
  const artikul = code.attr('title')?.trim() || code.text().trim() || undefined;
  const packSize = extractDojdevikPackCount($, title ?? '');

  const out: PromUaHtmlContext = { packSize };
  assignOptional(out, 'htmlPrice', htmlPrice);
  assignOptional(out, 'artikul', artikul);
  assignOptional(out, 'title', title);
  assignOptional(out, 'csrfToken', extractPromUaCsrfToken(html));
  return out;
}
