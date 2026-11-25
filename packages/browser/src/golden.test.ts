import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { fetchKonkPageData } from './fetchKonkPageData.js';
import { loadFixturePack } from './loadFixturePack.js';
import { parseSkuPage, parseSkugrPage } from './registry.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/pages');

const KONKS = [
  '_sample',
  'air',
  'balun',
  'dojdevik',
  'yumin',
  'sharte',
  'perfect',
  'svbum',
  'partymall',
] as const;

const CART_SKU_KONKS = new Set(['balun', 'dojdevik', 'sharte', 'perfect']);

function isSkuSlot(id: string): boolean {
  return id.startsWith('sku');
}

function isSkugrSlot(id: string): boolean {
  return id.startsWith('skugr');
}

describe('golden fetchKonkPageData', () => {
  for (const konk of KONKS) {
    it(`${konk}: every slotted expected matches fetchKonkPageData`, async () => {
      const pack = await loadFixturePack(fixturesRoot, konk);

      for (const slot of pack.slots) {
        if (!slot.expected || !slot.meta?.url) {
          continue;
        }

        const type = isSkugrSlot(slot.id) ? 'skugr' : 'sku';
        if (type === 'sku' && !isSkuSlot(slot.id)) {
          continue;
        }

        const result = await fetchKonkPageData(
          { konk, url: slot.meta.url, type },
          { fixturesRoot },
        );
        expect(result, `${konk}/${slot.id}`).toEqual(slot.expected);
      }
    });
  }
});

describe('golden HTML parsers (non-cart sku + all skugr)', () => {
  for (const konk of KONKS) {
    it(`${konk}: HTML-only slots match parse*Page`, async () => {
      const pack = await loadFixturePack(fixturesRoot, konk);

      for (const slot of pack.slots) {
        if (!slot.expected) {
          continue;
        }

        const ctx = {
          konk: pack.konk,
          url: slot.meta?.url,
          productId: typeof slot.meta?.productId === 'string' ? slot.meta.productId : undefined,
        };

        if (isSkugrSlot(slot.id)) {
          expect(parseSkugrPage(slot.html, ctx)).toEqual(slot.expected);
          continue;
        }

        if (!isSkuSlot(slot.id)) {
          continue;
        }

        // Cart pipelines need companion responses; HTML registry path is not the golden path.
        if (CART_SKU_KONKS.has(konk) && slot.meta?.responses) {
          continue;
        }
        if (konk === 'balun' || konk === 'dojdevik') {
          continue;
        }

        expect(parseSkuPage(slot.html, ctx), `${konk}/${slot.id}`).toEqual(slot.expected);
      }
    });
  }
});
