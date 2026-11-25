import { createSeededWorld } from '@balloons/memory';
import { describe, expect, it } from 'vitest';
import {
  reportKonkProdSalesSeries,
  reportKonkProdSkugrGroupsSales,
  reportKonkProdStockSeries,
  reportManufacturersPie,
  reportProdKonksPie,
  reportSelectionSkusPie,
  reportSkuByDate,
  reportSkuRange,
  reportSkugrDailySummary,
  reportSkugrSkusSales,
} from './aggregates/reports.js';
import { materializeManufacturerDaySalesDateRange } from './materialize.js';

async function seedReportingWorld() {
  const d0 = new Date('2026-07-14T00:00:00.000Z');
  const d1 = new Date('2026-07-15T00:00:00.000Z');
  const d2 = new Date('2026-07-16T00:00:00.000Z');

  const world = await createSeededWorld({
    konk: { name: 'air', title: 'Air' },
    prod: { name: 'latex', title: 'Latex' },
    sku: {
      id: 'sku-air-1',
      productId: 'air-P1',
      artikul: 'A1',
      title: 'Air SKU 1',
    },
    skugr: {
      id: 'skugr-air-1',
      title: 'Air group 1',
      skuIds: ['sku-air-1'],
    },
    points: [
      { date: d0, stock: 100, price: 10 },
      { date: d1, stock: 70, price: 10 },
      { date: d2, stock: 50, price: 10 },
    ],
  });

  await world.catalog.seedSku({
    id: 'sku-air-2',
    konkName: 'air',
    prodName: 'latex',
    productId: 'air-P2',
    artikul: 'A2',
    title: 'Air SKU 2',
    url: 'https://example.com/air-2',
    imageUrl: '',
    isInvalid: false,
  });
  await world.catalog.seedSkugr({
    id: 'skugr-air-2',
    konkName: 'air',
    prodName: 'latex',
    title: 'Air group 2',
    url: 'https://example.com/g2',
    isSliced: true,
    skuIds: ['sku-air-2'],
  });
  // Also attach sku-air-2 to first group for skugr daily with multi-sku option via skugr-air-1 update
  await world.catalog.seedSkugr({
    id: 'skugr-air-1',
    konkName: 'air',
    prodName: 'latex',
    title: 'Air group 1',
    url: 'https://example.com/g1',
    isSliced: true,
    skuIds: ['sku-air-1'],
  });

  await world.slices.upsertPoint({
    konkName: 'air',
    productId: 'air-P2',
    date: d0,
    point: { stock: 40, price: 5 },
  });
  await world.slices.upsertPoint({
    konkName: 'air',
    productId: 'air-P2',
    date: d1,
    point: { stock: 30, price: 5 },
  });
  await world.slices.upsertPoint({
    konkName: 'air',
    productId: 'air-P2',
    date: d2,
    point: { stock: 20, price: 5 },
  });

  await world.catalog.seedKonk({
    id: 'konk-balun',
    name: 'balun',
    title: 'Balun',
    url: 'https://balun.example',
    imageUrl: '',
    recountDays: [],
  });
  await world.catalog.seedSku({
    id: 'sku-balun-1',
    konkName: 'balun',
    prodName: 'latex',
    productId: 'balun-P1',
    artikul: 'B1',
    title: 'Balun SKU 1',
    url: 'https://example.com/balun-1',
    imageUrl: '',
    isInvalid: false,
  });
  await world.slices.upsertPoint({
    konkName: 'balun',
    productId: 'balun-P1',
    date: d0,
    point: { stock: 200, price: 8 },
  });
  await world.slices.upsertPoint({
    konkName: 'balun',
    productId: 'balun-P1',
    date: d1,
    point: { stock: 150, price: 8 },
  });

  const deps = { catalog: world.catalog, slices: world.slices, sales: world.sales };
  await materializeManufacturerDaySalesDateRange({
    deps,
    konkName: 'air',
    fromDate: d1,
    toDate: d2,
  });
  await materializeManufacturerDaySalesDateRange({
    deps,
    konkName: 'balun',
    fromDate: d1,
    toDate: d1,
  });

  return { world, d0, d1, d2, deps };
}

describe('JSON aggregates', () => {
  it('reportSkuByDate and reportSkuRange', async () => {
    const { world, d1, d2 } = await seedReportingWorld();

    const byDate = await reportSkuByDate({
      catalog: world.catalog,
      slices: world.slices,
      skuId: 'sku-air-1',
      date: d1,
    });
    expect(byDate).toMatchObject({ sales: 30, revenue: 300, isDeliveryDay: false });

    const range = await reportSkuRange({
      catalog: world.catalog,
      slices: world.slices,
      skuId: 'sku-air-1',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(range).toHaveLength(2);
    expect(range![0]).toMatchObject({ date: '2026-07-15', sales: 30, revenue: 300 });
    expect(range![1]).toMatchObject({ date: '2026-07-16', sales: 20, revenue: 200 });

    expect(
      await reportSkuByDate({
        catalog: world.catalog,
        slices: world.slices,
        skuId: 'missing-sku',
        date: d1,
      }),
    ).toBeNull();
  });

  it('reportSkugrDailySummary and reportSkugrSkusSales', async () => {
    const { world, d1, d2 } = await seedReportingWorld();

    const daily = await reportSkugrDailySummary({
      catalog: world.catalog,
      slices: world.slices,
      skugrId: 'skugr-air-1',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(daily).toHaveLength(2);
    expect(daily![0]).toMatchObject({ date: '2026-07-15', stock: 70, sales: 30 });

    const skusSales = await reportSkugrSkusSales({
      catalog: world.catalog,
      slices: world.slices,
      skugrId: 'skugr-air-1',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(skusSales?.skugrTitle).toBe('Air group 1');
    expect(skusSales?.all.salesPcs).toBe(50);
    expect(skusSales?.data[0]?.skuId).toBe('sku-air-1');

    expect(
      await reportSkugrDailySummary({
        catalog: world.catalog,
        slices: world.slices,
        skugrId: 'missing-skugr',
        dateFrom: d1,
        dateTo: d2,
      }),
    ).toBeNull();
  });

  it('reportKonkProdSkugrGroupsSales and stock/sales series', async () => {
    const { world, d1, d2 } = await seedReportingWorld();

    const groups = await reportKonkProdSkugrGroupsSales({
      catalog: world.catalog,
      slices: world.slices,
      konk: 'air',
      prod: 'latex',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(groups?.data.length).toBeGreaterThanOrEqual(2);
    expect(groups?.all.salesPcs).toBe(70); // 50 from P1 + 20 from P2 (10+10)

    const stock = await reportKonkProdStockSeries({
      catalog: world.catalog,
      slices: world.slices,
      konk: 'air',
      prod: 'latex',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(stock.summary.stockLast).toBe(70); // 50+20 coalesced sum of last day stocks

    const rollupSeries = await reportKonkProdSalesSeries({
      catalog: world.catalog,
      slices: world.slices,
      sales: world.sales,
      konk: 'air',
      prod: 'latex',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(rollupSeries.summary.salesPcs).toBe(70);

    const filtered = await reportKonkProdSalesSeries({
      catalog: world.catalog,
      slices: world.slices,
      sales: world.sales,
      konk: 'air',
      prod: 'latex',
      dateFrom: d1,
      dateTo: d2,
      skugrIds: ['skugr-air-1'],
    });
    expect(filtered.summary.salesPcs).toBe(50);
  });

  it('manufacturers pie, prod-konks pie with excludeKonks, selection pie', async () => {
    const { world, d1, d2 } = await seedReportingWorld();

    const mfr = await reportManufacturersPie({
      catalog: world.catalog,
      sales: world.sales,
      konk: 'air',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(mfr.data.latex?.salesPcs).toBe(70);
    expect(mfr.all.salesPcs).toBe(70);

    const pieAll = await reportProdKonksPie({
      catalog: world.catalog,
      sales: world.sales,
      prod: 'latex',
      dateFrom: d1,
      dateTo: d2,
    });
    expect(pieAll.data.air?.salesPcs).toBe(70);
    expect(pieAll.data.balun?.salesPcs).toBe(50);

    const pieEx = await reportProdKonksPie({
      catalog: world.catalog,
      sales: world.sales,
      prod: 'latex',
      dateFrom: d1,
      dateTo: d2,
      excludeKonks: ['balun'],
    });
    expect(pieEx.data.balun).toBeUndefined();
    expect(pieEx.data.air?.salesPcs).toBe(70);
    expect(pieEx.all.salesPcs).toBe(70);

    const byIds = await reportSelectionSkusPie({
      catalog: world.catalog,
      slices: world.slices,
      dateFrom: d1,
      dateTo: d2,
      skuIds: ['sku-air-1', 'sku-air-2'],
    });
    expect(byIds.all.salesPcs).toBe(70);
    expect(byIds.data['sku-air-1']?.sharePcs).toBeGreaterThan(0);

    const selectAll = await reportSelectionSkusPie({
      catalog: world.catalog,
      slices: world.slices,
      dateFrom: d1,
      dateTo: d2,
      selectAll: true,
      konkName: 'air',
      prodName: 'latex',
    });
    expect(Object.keys(selectAll.data).length).toBe(2);
    expect(selectAll.all.salesPcs).toBe(70);
  });
});
