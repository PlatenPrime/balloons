import { parseSampleSkuPage } from './parsers/_sample/parseSkuPage.js';
import { parseSampleSkugrPage } from './parsers/_sample/parseSkugrPage.js';
import type { SkuPageParser, SkugrPageParser } from './types.js';

const skuParsers: Record<string, SkuPageParser> = {
  _sample: parseSampleSkuPage,
};

const skugrParsers: Record<string, SkugrPageParser> = {
  _sample: parseSampleSkugrPage,
};

export function getSkuParser(konk: string): SkuPageParser {
  const parser = skuParsers[konk];
  if (!parser) {
    throw new Error(`No sku-page parser registered for konk "${konk}"`);
  }
  return parser;
}

export function getSkugrParser(konk: string): SkugrPageParser {
  const parser = skugrParsers[konk];
  if (!parser) {
    throw new Error(`No skugr-page parser registered for konk "${konk}"`);
  }
  return parser;
}

export function parseSkuPage(
  html: string,
  ctx: { konk: string; url?: string; productId?: string },
) {
  return getSkuParser(ctx.konk)(html, ctx);
}

export function parseSkugrPage(
  html: string,
  ctx: { konk: string; url?: string; productId?: string },
) {
  return getSkugrParser(ctx.konk)(html, ctx);
}
