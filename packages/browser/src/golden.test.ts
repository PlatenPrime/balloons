import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadFixturePack } from './loadFixturePack.js';
import { parseSkuPage, parseSkugrPage } from './registry.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/pages');

describe('golden parsers (_sample)', () => {
  it('matches manifest expected for sku-page and skugr-page', async () => {
    const pack = await loadFixturePack(fixturesRoot, '_sample');

    for (const slot of pack.slots) {
      if (!slot.expected) {
        continue;
      }

      const ctx = {
        konk: pack.konk,
        url: slot.meta?.url,
        productId: slot.meta?.productId,
      };

      if (slot.id === 'sku-page') {
        expect(parseSkuPage(slot.html, ctx)).toEqual(slot.expected);
        continue;
      }

      if (slot.id === 'skugr-page') {
        expect(parseSkugrPage(slot.html, ctx)).toEqual(slot.expected);
      }
    }
  });
});
