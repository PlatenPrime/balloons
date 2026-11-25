import { createSeededWorld } from '@balloons/memory';
import { describe, expect, it } from 'vitest';
import {
  materializeManufacturerDaySales,
  materializeManufacturerDaySalesDateRange,
} from './materialize.js';

describe('materialize', () => {
  it('buckets multi-SKU sales into multi-prod rollups', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');

    const world = await createSeededWorld({
      konk: { name: 'air', title: 'Air' },
      prod: { name: 'prod-a', title: 'Prod A' },
      sku: { productId: 'air-A1', artikul: 'A1', title: 'SKU A' },
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });

    await world.catalog.seedProd({
      id: 'prod-b-id',
      name: 'prod-b',
      title: 'Prod B',
      imageUrl: '',
    });
    await world.catalog.seedSku({
      id: 'sku-b',
      konkName: 'air',
      prodName: 'prod-b',
      productId: 'air-B1',
      artikul: 'B1',
      title: 'SKU B',
      url: 'https://example.com/b',
      imageUrl: '',
      isInvalid: false,
    });
    await world.slices.upsertPoint({
      konkName: 'air',
      productId: 'air-B1',
      date: d0,
      point: { stock: 50, price: 20 },
    });
    await world.slices.upsertPoint({
      konkName: 'air',
      productId: 'air-B1',
      date: d1,
      point: { stock: 40, price: 20 },
    });

    const deps = { catalog: world.catalog, slices: world.slices, sales: world.sales };
    await materializeManufacturerDaySales({ deps, konkName: 'air', dayD: d1 });

    const rows = await world.sales.listByKonkDateRange('air', d1, d1);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.prodName === 'prod-a')).toMatchObject({
      salesPcs: 30,
      salesUah: 300,
    });
    expect(rows.find((r) => r.prodName === 'prod-b')).toMatchObject({
      salesPcs: 10,
      salesUah: 200,
    });
  });

  it('clears rollup when day has no slice points', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });
    const deps = { catalog: world.catalog, slices: world.slices, sales: world.sales };
    await materializeManufacturerDaySales({ deps, konkName: world.konk.name, dayD: d1 });
    expect(await world.sales.listByKonkDateRange(world.konk.name, d1, d1)).toHaveLength(1);

    const emptyDay = new Date('2026-07-20T00:00:00.000Z');
    await materializeManufacturerDaySales({
      deps,
      konkName: world.konk.name,
      dayD: emptyDay,
    });
    expect(await world.sales.listByKonkDateRange(world.konk.name, emptyDay, emptyDay)).toEqual([]);
  });

  it('date-range backfill materializes inclusive days', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const d2 = new Date('2026-07-16T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 80, price: 10 },
        { date: d2, stock: 50, price: 10 },
      ],
    });
    const deps = { catalog: world.catalog, slices: world.slices, sales: world.sales };

    const result = await materializeManufacturerDaySalesDateRange({
      deps,
      konkName: world.konk.name,
      fromDate: d1,
      toDate: d2,
    });

    expect(result.daysTouched).toEqual(expect.arrayContaining(['2026-07-15', '2026-07-16']));
    const rows = await world.sales.listByKonkDateRange(world.konk.name, d1, d2);
    expect(rows.find((r) => r.date.toISOString().startsWith('2026-07-15'))).toMatchObject({
      salesPcs: 20,
      salesUah: 200,
    });
    expect(rows.find((r) => r.date.toISOString().startsWith('2026-07-16'))).toMatchObject({
      salesPcs: 30,
      salesUah: 300,
    });
  });
});
