import { describe, expect, it } from 'vitest';
import { coalesceSlicePointsAlongDates } from './coalescePoints.js';

describe('coalesceSlicePointsAlongDates', () => {
  const d0 = new Date('2026-07-14T00:00:00.000Z');
  const d1 = new Date('2026-07-15T00:00:00.000Z');
  const d2 = new Date('2026-07-16T00:00:00.000Z');
  const d3 = new Date('2026-07-17T00:00:00.000Z');

  it('forward-fills gaps without updating carry on missing days', () => {
    const byIso = new Map([
      [d0.toISOString(), { stock: 100, price: 10 }],
      [d2.toISOString(), { stock: 70, price: 12 }],
    ]);

    const out = coalesceSlicePointsAlongDates([d0, d1, d2, d3], (d) => byIso.get(d.toISOString()));

    expect(out).toEqual([
      { stock: 100, price: 10 },
      { stock: 100, price: 10 },
      { stock: 70, price: 12 },
      { stock: 70, price: 12 },
    ]);
  });

  it('does not update carry on -1 stock or price', () => {
    const byIso = new Map([
      [d0.toISOString(), { stock: 100, price: 10 }],
      [d1.toISOString(), { stock: -1, price: -1 }],
      [d2.toISOString(), { stock: 80, price: 11 }],
    ]);

    const out = coalesceSlicePointsAlongDates([d0, d1, d2], (d) => byIso.get(d.toISOString()));

    expect(out).toEqual([
      { stock: 100, price: 10 },
      { stock: 100, price: 10 },
      { stock: 80, price: 11 },
    ]);
  });

  it('respects initial carry when first days are empty', () => {
    const out = coalesceSlicePointsAlongDates([d0, d1], () => null, {
      lastStock: 55,
      lastPrice: 9,
    });
    expect(out).toEqual([
      { stock: 55, price: 9 },
      { stock: 55, price: 9 },
    ]);
  });
});
