import { describe, expect, it } from 'vitest';
import {
  decidePackFlipPatchesForSeries,
  detectInversePackFlip,
  detectPriceOnlyPackFlip,
} from './packFlipDetect.js';

describe('packFlipDetect', () => {
  it('detects inverse pack flip when value is preserved', () => {
    const prev = { stock: 10, price: 100 };
    const curr = { stock: 20, price: 50 };
    expect(detectInversePackFlip(prev, curr)).toEqual({
      kind: 'inverse',
      factor: 2,
      currStockScaledUp: true,
    });
  });

  it('detects price-only flip when stock stays close', () => {
    const prev = { stock: 10, price: 100 };
    const curr = { stock: 10, price: 50 };
    expect(detectPriceOnlyPackFlip(prev, curr)).toEqual({
      kind: 'price-only',
      factor: 2,
    });
  });

  it('patches middle day of round-trip A→B→A series', () => {
    const series = [
      { dateMs: 1, point: { stock: 10, price: 100 } },
      { dateMs: 2, point: { stock: 20, price: 50 } },
      { dateMs: 3, point: { stock: 10, price: 100 } },
    ];
    const decisions = decidePackFlipPatchesForSeries(series);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      kind: 'inverse',
      index: 1,
      patched: { stock: 10, price: 100 },
    });
  });
});
