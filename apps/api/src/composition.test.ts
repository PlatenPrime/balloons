import {
  configureScheduleMaterialize,
  reportKonkProdSalesSeries,
  reportKonkProdStockSeries,
} from '@balloons/reporting';
import { afterEach, describe, expect, it } from 'vitest';
import { createAppDeps } from './composition.js';

describe('createAppDeps demo seed', () => {
  afterEach(() => {
    configureScheduleMaterialize({ reset: true, deps: null, runner: null });
  });

  it('upserts three demo points and materializes sales for analytics', async () => {
    const deps = await createAppDeps({ useInProcessExcelBuild: true });
    const [sku] = await deps.catalog.listSkus();
    expect(sku).toBeDefined();

    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const d2 = new Date('2026-07-16T00:00:00.000Z');

    await expect(deps.slices.getPoint(sku!.konkName, sku!.productId, d0)).resolves.toMatchObject({
      stock: 100,
      price: 10,
    });
    await expect(deps.slices.getPoint(sku!.konkName, sku!.productId, d1)).resolves.toMatchObject({
      stock: 70,
      price: 10,
    });
    await expect(deps.slices.getPoint(sku!.konkName, sku!.productId, d2)).resolves.toMatchObject({
      stock: 50,
      price: 10,
    });

    const stock = await reportKonkProdStockSeries({
      catalog: deps.catalog,
      slices: deps.slices,
      konk: sku!.konkName,
      prod: sku!.prodName,
      dateFrom: d0,
      dateTo: d2,
    });
    expect(stock.summary.stockLast).toBe(50);
    expect(stock.days).toHaveLength(3);

    const sales = await reportKonkProdSalesSeries({
      catalog: deps.catalog,
      slices: deps.slices,
      sales: deps.sales,
      konk: sku!.konkName,
      prod: sku!.prodName,
      dateFrom: d1,
      dateTo: d2,
    });
    // 100→70 = 30, 70→50 = 20
    expect(sales.summary.salesPcs).toBe(50);
  });

  it('does not seed catalog or demo points when seedWorld is false', async () => {
    const deps = await createAppDeps({ seedWorld: false, useInProcessExcelBuild: true });
    expect(await deps.catalog.listSkus()).toEqual([]);
    expect(await deps.catalog.listKonks()).toEqual([]);
  });
});
