import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { findSlotById, loadFixturePack } from '../loadFixturePack.js';
import { createFixtureTransport } from './fixtureTransport.js';
import { StageError } from './stageError.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures/pages');

describe('FixtureTransport', () => {
  it('returns slot html for fetchHtml', async () => {
    const pack = await loadFixturePack(fixturesRoot, 'air');
    const slot = findSlotById(pack, 'sku-page');
    expect(slot).toBeDefined();
    const transport = createFixtureTransport({ konk: 'air', packDir: pack.dir, slot: slot! });
    const res = await transport.request({ stageKey: 'fetchHtml' });
    expect(res.status).toBe(200);
    expect(res.body).toContain('max-product-quantity');
  });

  it('throws StageError when companion mapping is missing', async () => {
    const pack = await loadFixturePack(fixturesRoot, 'air');
    const slot = findSlotById(pack, 'sku-page');
    const transport = createFixtureTransport({ konk: 'air', packDir: pack.dir, slot: slot! });
    await expect(transport.request({ stageKey: 'addToCart' })).rejects.toBeInstanceOf(StageError);
  });

  it('marks *.fail.* companions as HTTP 500', async () => {
    const pack = await loadFixturePack(fixturesRoot, 'sharte');
    const slot = findSlotById(pack, 'sku-cart-fail');
    expect(slot).toBeDefined();
    const transport = createFixtureTransport({
      konk: 'sharte',
      packDir: pack.dir,
      slot: slot!,
    });
    const res = await transport.request({ stageKey: 'addToCart' });
    expect(res.status).toBe(500);
  });
});
