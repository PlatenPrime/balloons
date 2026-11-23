import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseFixtureManifest, safeParseFixtureManifest } from './manifestSchema.js';

const sampleManifestPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../fixtures/pages/_sample/manifest.json',
);

describe('fixtureManifestSchema', () => {
  it('accepts the ROADMAP sample shape', () => {
    const parsed = parseFixtureManifest({
      konk: 'air',
      slots: [
        {
          id: 'sku-page',
          file: 'sku-page.html',
          meta: { url: 'https://example/product/1', productId: 'P1' },
          expected: { stock: 10, price: 99.5 },
        },
        {
          id: 'skugr-page',
          file: 'skugr-page.html',
          meta: { url: 'https://example/group/1' },
          expected: { products: [{ productId: 'P1', url: '...' }] },
        },
      ],
    });
    expect(parsed.konk).toBe('air');
    expect(parsed.slots).toHaveLength(2);
  });

  it('rejects empty slots', () => {
    const result = safeParseFixtureManifest({ konk: 'air', slots: [] });
    expect(result.success).toBe(false);
  });

  it('validates fixtures/pages/_sample/manifest.json', () => {
    const raw = JSON.parse(readFileSync(sampleManifestPath, 'utf8')) as unknown;
    const parsed = parseFixtureManifest(raw);
    expect(parsed.konk).toBe('_sample');
    expect(parsed.slots.map((s) => s.id)).toEqual(['sku-page', 'skugr-page']);
  });
});
