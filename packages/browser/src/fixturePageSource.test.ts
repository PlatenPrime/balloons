import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createFixturePageSource } from './fixturePageSource.js';
import { getSkuParser, getSkugrParser } from './registry.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/pages');

describe('createFixturePageSource', () => {
  const source = createFixturePageSource({ fixturesRoot });

  it('returns sku-page HTML by meta.url', async () => {
    const html = await source.getSkuPageHtml('_sample', 'https://example.com/product/1');
    expect(html).toContain('data-stock="10"');
    expect(html).toContain('data-price="99.5"');
  });

  it('returns skugr-page HTML by meta.url', async () => {
    const html = await source.getSkugrPageHtml('_sample', 'https://example.com/group/1');
    expect(html).toContain('data-product-id="P1"');
  });

  it('falls back to slot id when url is unknown', async () => {
    const html = await source.getSkuPageHtml('_sample', 'https://example.com/missing');
    expect(html).toContain('Sample product card');
  });
});

describe('parser registry', () => {
  it('throws for unknown konk', () => {
    expect(() => getSkuParser('no-such-konk')).toThrow(/No sku-page parser/);
    expect(() => getSkugrParser('no-such-konk')).toThrow(/No skugr-page parser/);
  });
});
