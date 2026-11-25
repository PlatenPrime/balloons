import { describe, expect, it } from 'vitest';
import {
  applyRecountDayToSales,
  computePersistedDaySales,
  computeRevenueForDay,
  computeSalesFromStockSequence,
  computeSharePercent,
} from './salesMath.js';

describe('salesMath', () => {
  it('computes sales deltas and delivery days', () => {
    expect(computeSalesFromStockSequence([1000, 800, 500])).toEqual([
      { sales: 0, isDeliveryDay: false },
      { sales: 200, isDeliveryDay: false },
      { sales: 300, isDeliveryDay: false },
    ]);
    expect(computeSalesFromStockSequence([800, 1000])[1]).toEqual({
      sales: 0,
      isDeliveryDay: true,
    });
  });

  it('treats null gaps in stock sequence as zero sales', () => {
    expect(computeSalesFromStockSequence([100, null, 70])).toEqual([
      { sales: 0, isDeliveryDay: false },
      { sales: 0, isDeliveryDay: false },
      { sales: 0, isDeliveryDay: false },
    ]);
    expect(computeSalesFromStockSequence([null, 50])).toEqual([
      { sales: 0, isDeliveryDay: false },
      { sales: 0, isDeliveryDay: false },
    ]);
  });

  it('applies recount days and revenue', () => {
    const day = new Date('2026-07-14T00:00:00.000Z');
    expect(applyRecountDayToSales(100, day, new Set(['2026-07-14']))).toBe(0);
    expect(computeRevenueForDay(10, 12.5)).toBe(125);
    expect(computeSharePercent(25, 100)).toBe(25);
  });

  it('persisted day sales: -1 → 0; delta otherwise', () => {
    const day = new Date('2026-07-15T00:00:00.000Z');
    expect(
      computePersistedDaySales({
        prevStockRaw: 100,
        currStockRaw: -1,
        currPriceRaw: 10,
        date: day,
      }),
    ).toEqual({ salesPcs: 0, salesUah: 0, isDeliveryDay: false });

    expect(
      computePersistedDaySales({
        prevStockRaw: 100,
        currStockRaw: 70,
        currPriceRaw: 10,
        date: day,
      }),
    ).toEqual({ salesPcs: 30, salesUah: 300, isDeliveryDay: false });
  });

  it('persisted day sales applies recountDays', () => {
    const day = new Date('2026-07-15T00:00:00.000Z');
    expect(
      computePersistedDaySales({
        prevStockRaw: 100,
        currStockRaw: 70,
        currPriceRaw: 10,
        date: day,
        recountDays: new Set(['2026-07-15']),
      }),
    ).toEqual({ salesPcs: 0, salesUah: 0, isDeliveryDay: false });
  });

  it('persisted day sales: delivery day zeros sales', () => {
    const day = new Date('2026-07-15T00:00:00.000Z');
    expect(
      computePersistedDaySales({
        prevStockRaw: 50,
        currStockRaw: 120,
        currPriceRaw: 10,
        date: day,
      }),
    ).toEqual({ salesPcs: 0, salesUah: 0, isDeliveryDay: true });
  });
});
