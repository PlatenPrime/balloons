import { parseAirSkuPage } from './parsers/air/parseSkuPage.js';
import { parseAirSkugrPage } from './parsers/air/parseSkugrPage.js';
import { parseSampleSkuPage } from './parsers/_sample/parseSkuPage.js';
import { parseSampleSkugrPage } from './parsers/_sample/parseSkugrPage.js';
import { parsePartymallSkuPage } from './parsers/partymall/parseSkuPage.js';
import { parsePartymallSkugrPage } from './parsers/partymall/parseSkugrPage.js';
import { parsePerfectSkuPage } from './parsers/perfect/parseSkuPage.js';
import { parsePerfectSkugrPage } from './parsers/perfect/parseSkugrPage.js';
import {
  parseBalunHtmlContext,
  parseDojdevikHtmlContext,
} from './parsers/promua/parseHtmlContext.js';
import { parsePromUaSkugrPage } from './parsers/promua/parseSkugrPage.js';
import { parseSharteSkuPage } from './parsers/sharte/parseSkuPage.js';
import { parseSharteSkugrPage } from './parsers/sharte/parseSkugrPage.js';
import { parseSvbumSkuPage } from './parsers/svbum/parseSkuPage.js';
import { parseSvbumSkugrPage } from './parsers/svbum/parseSkugrPage.js';
import { parseYuminSkuPage } from './parsers/yumin/parseSkuPage.js';
import { parseYuminSkugrPage } from './parsers/yumin/parseSkugrPage.js';
import { roundMoney } from './util/parseMoney.js';
import { skuResult } from './util/result.js';
import type { SkuPageParser, SkugrPageParser } from './types.js';

const parseBalunSkuHtmlOnly: SkuPageParser = (html) => {
  const ctxHtml = parseBalunHtmlContext(html);
  return skuResult(-1, ctxHtml.htmlPrice ?? -1, { artikul: ctxHtml.artikul });
};

const parseDojdevikSkuHtmlOnly: SkuPageParser = (html) => {
  const ctxHtml = parseDojdevikHtmlContext(html);
  const packSize = ctxHtml.packSize > 0 ? ctxHtml.packSize : 1;
  const packagePrice = ctxHtml.htmlPrice;
  if (packagePrice === undefined) {
    return skuResult(-1, -1, { artikul: ctxHtml.artikul, title: ctxHtml.title });
  }
  return skuResult(-1, roundMoney(packagePrice / packSize), {
    artikul: ctxHtml.artikul,
    title: ctxHtml.title,
    packSize: packSize > 1 ? packSize : undefined,
  });
};

const skuParsers: Record<string, SkuPageParser> = {
  _sample: parseSampleSkuPage,
  air: parseAirSkuPage,
  yumin: parseYuminSkuPage,
  svbum: parseSvbumSkuPage,
  partymall: parsePartymallSkuPage,
  sharte: parseSharteSkuPage,
  perfect: parsePerfectSkuPage,
  balun: parseBalunSkuHtmlOnly,
  dojdevik: parseDojdevikSkuHtmlOnly,
};

const skugrParsers: Record<string, SkugrPageParser> = {
  _sample: parseSampleSkugrPage,
  air: parseAirSkugrPage,
  yumin: parseYuminSkugrPage,
  svbum: parseSvbumSkugrPage,
  partymall: parsePartymallSkugrPage,
  sharte: parseSharteSkugrPage,
  perfect: parsePerfectSkugrPage,
  balun: parsePromUaSkugrPage,
  dojdevik: parsePromUaSkugrPage,
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
