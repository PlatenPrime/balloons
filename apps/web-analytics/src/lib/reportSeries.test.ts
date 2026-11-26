import { describe, expect, it } from 'vitest';
import { buildSeriesQuery, readSalesSeries, readStockSeries } from './reportSeries.js';

describe('readSalesSeries', () => {
  it('maps days and summary', () => {
    const result = readSalesSeries({
      days: [{ date: '2026-07-15', sales: 30, revenue: 300, stock: 70 }],
      summary: { salesPcs: 30, salesUah: 300 },
    });
    expect(result.days).toEqual([{ date: '2026-07-15', sales: 30, revenue: 300, stock: 70 }]);
    expect(result.summary).toEqual({ salesPcs: 30, salesUah: 300 });
  });

  it('handles missing/null payload as empty', () => {
    expect(readSalesSeries(null)).toEqual({ days: [], summary: null });
    expect(readSalesSeries(undefined).days).toEqual([]);
    expect(readSalesSeries({ days: [] }).summary).toBeNull();
  });

  it('coerces sparse day fields', () => {
    expect(readSalesSeries({ days: [{}] }).days[0]).toEqual({
      date: '',
      sales: 0,
      revenue: 0,
      stock: 0,
    });
  });
});

describe('readStockSeries', () => {
  it('maps days and stockLast', () => {
    const result = readStockSeries({
      days: [{ date: '2026-07-16', stock: 50 }],
      summary: { stockLast: 50 },
    });
    expect(result.days).toEqual([{ date: '2026-07-16', stock: 50 }]);
    expect(result.summary).toEqual({ stockLast: 50 });
  });

  it('omits summary when absent', () => {
    expect(readStockSeries({ days: [{ date: '2026-07-14', stock: 100 }] }).summary).toBeNull();
  });
});

describe('buildSeriesQuery', () => {
  it('omits skugrIds when empty', () => {
    expect(
      buildSeriesQuery({
        konk: 'air',
        prod: 'sample-prod',
        dateFrom: '2026-07-14',
        dateTo: '2026-07-16',
      }),
    ).toEqual({
      konk: 'air',
      prod: 'sample-prod',
      dateFrom: '2026-07-14',
      dateTo: '2026-07-16',
    });
  });

  it('includes skugrIds when set', () => {
    expect(
      buildSeriesQuery({
        konk: 'air',
        prod: 'sample-prod',
        dateFrom: '2026-07-14',
        dateTo: '2026-07-16',
        skugrIds: 'g1',
      }).skugrIds,
    ).toBe('g1');
  });
});
