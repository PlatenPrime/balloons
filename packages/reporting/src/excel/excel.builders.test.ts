import { createSeededWorld } from '@balloons/memory';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildExcelFromSnapshot } from './builders.js';
import { buildExcelSnapshot } from './snapshot.js';

async function loadSheetNames(buffer: Buffer): Promise<{ names: string[]; rowCount: number }> {
  const wb = new ExcelJS.Workbook();
  // exceljs typings accept Buffer via ArrayBuffer-like
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  return {
    names: wb.worksheets.map((s) => s.name),
    rowCount: sheet?.rowCount ?? 0,
  };
}

describe('excel builders content smoke', () => {
  it('builds sku-konk-sales with Sales sheet', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });
    const params = {
      konk: world.konk.name,
      prod: world.prod.name,
      dateFrom: '2026-07-14',
      dateTo: '2026-07-15',
    };
    const snapshot = await buildExcelSnapshot({
      kind: 'sku-konk-sales',
      jobParams: params,
      catalog: world.catalog,
      slices: world.slices,
    });
    const built = await buildExcelFromSnapshot('sku-konk-sales', params, snapshot);
    const { names, rowCount } = await loadSheetNames(built.buffer);
    expect(names).toContain('Sales');
    expect(rowCount).toBeGreaterThan(1);
    expect(built.filename).toBe('sku-konk-sales.xlsx');
  });

  it('builds sku-skugr-stock with Stock sheet', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });
    const params = {
      skugrId: world.skugr.id,
      dateFrom: '2026-07-14',
      dateTo: '2026-07-15',
    };
    const snapshot = await buildExcelSnapshot({
      kind: 'sku-skugr-stock',
      jobParams: params,
      catalog: world.catalog,
      slices: world.slices,
    });
    const built = await buildExcelFromSnapshot('sku-skugr-stock', params, snapshot);
    const { names, rowCount } = await loadSheetNames(built.buffer);
    expect(names).toContain('Stock');
    expect(rowCount).toBeGreaterThan(1);
  });

  it('builds sku-selection-sales with Sales and Share sheets', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });
    const params = {
      skuIds: [world.sku.id],
      dateFrom: '2026-07-14',
      dateTo: '2026-07-15',
    };
    const snapshot = await buildExcelSnapshot({
      kind: 'sku-selection-sales',
      jobParams: params,
      catalog: world.catalog,
      slices: world.slices,
    });
    const built = await buildExcelFromSnapshot('sku-selection-sales', params, snapshot);
    const { names, rowCount } = await loadSheetNames(built.buffer);
    expect(names).toEqual(expect.arrayContaining(['Sales', 'Share']));
    expect(rowCount).toBeGreaterThan(1);
  });
});
