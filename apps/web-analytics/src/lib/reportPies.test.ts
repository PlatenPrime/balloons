import { describe, expect, it } from 'vitest';
import {
  buildSelectionPieQuery,
  canQuerySelectionPie,
  mapNamedSalesPie,
  mapSelectionPie,
} from './reportPies.js';

describe('mapNamedSalesPie', () => {
  it('maps title/key and salesPcs', () => {
    expect(
      mapNamedSalesPie({
        latex: { title: 'Latex', salesPcs: 70, salesUah: 700 },
        empty: { title: '', salesPcs: 1, salesUah: 0 },
      }),
    ).toEqual([
      { key: 'latex', name: 'Latex', value: 70 },
      { key: 'empty', name: 'empty', value: 1 },
    ]);
  });

  it('returns empty for missing data', () => {
    expect(mapNamedSalesPie(undefined)).toEqual([]);
  });
});

describe('mapSelectionPie', () => {
  it('flattens sku rows for table + pie', () => {
    const rows = mapSelectionPie({
      'sku-1': {
        title: 'Air SKU',
        salesPcs: 30,
        salesUah: 300,
        sharePcs: 0.5,
        shareUah: 0.5,
      },
    });
    expect(rows[0]).toMatchObject({
      skuId: 'sku-1',
      pieName: 'Air SKU',
      pieValue: 30,
      sharePcs: 0.5,
    });
  });
});

describe('selection pie query', () => {
  it('requires selectAll or skuIds', () => {
    expect(
      canQuerySelectionPie({
        dateFrom: '2026-07-14',
        dateTo: '2026-07-16',
        selectAll: false,
      }),
    ).toBe(false);
    expect(
      canQuerySelectionPie({
        dateFrom: '2026-07-14',
        dateTo: '2026-07-16',
        selectAll: true,
      }),
    ).toBe(true);
    expect(
      canQuerySelectionPie({
        dateFrom: '2026-07-14',
        dateTo: '2026-07-16',
        selectAll: false,
        skuIds: 'a,b',
      }),
    ).toBe(true);
  });

  it('builds query without undefined optional keys written as empty', () => {
    expect(
      buildSelectionPieQuery({
        dateFrom: '2026-07-14',
        dateTo: '2026-07-16',
        selectAll: true,
        konkName: 'air',
      }),
    ).toEqual({
      dateFrom: '2026-07-14',
      dateTo: '2026-07-16',
      selectAll: 'true',
      konkName: 'air',
    });
  });
});
