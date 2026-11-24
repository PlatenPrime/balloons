import { isInvalidSlicePoint, toSliceDate } from '@balloons/domain';
import { describe, expect, it, vi } from 'vitest';
import { createSeededWorld } from './factories.js';
import { createInMemorySliceStore } from './inMemorySliceStore.js';

describe('in-memory catalog + slices', () => {
  it('seeds SKU / group / band and stores points', async () => {
    const day = new Date('2026-07-14T12:00:00.000Z');
    const world = await createSeededWorld({
      points: [{ date: day, stock: 10, price: 99.5 }],
    });

    const skus = await world.catalog.listSkus({ konkName: 'air' });
    expect(skus).toHaveLength(1);
    expect(skus[0]?.productId).toBe('air-P1');

    const groups = await world.catalog.listSkugrs({ isSliced: true });
    expect(groups[0]?.skuIds).toContain(world.sku.id);

    const point = await world.slices.getPoint('air', 'air-P1', day);
    expect(point).toEqual({ stock: 10, price: 99.5 });
    expect(isInvalidSlicePoint(point)).toBe(false);

    const listed = await world.slices.listPointsForDay('air', day);
    expect(listed).toEqual([{ productId: 'air-P1', point: { stock: 10, price: 99.5 } }]);
  });

  it('writes -1 points as invalid and fires onSliceStockMutated', async () => {
    const onSliceStockMutated = vi.fn();
    const slices = createInMemorySliceStore({ onSliceStockMutated });
    const day = new Date('2026-07-14T15:00:00.000Z');

    const point = await slices.upsertPoint({
      konkName: 'air',
      productId: 'air-P1',
      date: day,
      point: { stock: -1, price: -1 },
    });

    expect(isInvalidSlicePoint(point)).toBe(true);
    expect(onSliceStockMutated).toHaveBeenCalledWith({
      konkName: 'air',
      day: toSliceDate(day),
      productId: 'air-P1',
    });
  });

  it('upserts day-meta stats without dropping prior rotationMeta', async () => {
    const slices = createInMemorySliceStore();
    const day = new Date('2026-07-14T00:00:00.000Z');

    await slices.upsertDayMeta({
      konkName: 'air',
      date: day,
      rotationMeta: { cycleDays: 7, dayIndex: 2, dueCount: 10 },
    });
    const meta = await slices.upsertDayMeta({
      konkName: 'air',
      date: day,
      stats: { filled: 8, invalid: 2, errorCount: 0 },
    });

    expect(meta.rotationMeta).toEqual({ cycleDays: 7, dayIndex: 2, dueCount: 10 });
    expect(meta.stats).toEqual({ filled: 8, invalid: 2, errorCount: 0 });
  });

  it('updates and deletes stock bands', async () => {
    const world = await createSeededWorld();
    const updated = await world.catalog.updateStockBand({
      ...world.stockBand,
      stockMin: 80,
      stockMax: 180,
      normalMax: 40,
    });
    expect(updated.stockMin).toBe(80);
    expect(await world.catalog.getStockBandById(world.stockBand.id)).toEqual(updated);

    expect(await world.catalog.deleteStockBand(world.stockBand.id)).toBe(true);
    expect(await world.catalog.getStockBandById(world.stockBand.id)).toBeNull();
    expect(await world.catalog.deleteStockBand(world.stockBand.id)).toBe(false);
  });
});
