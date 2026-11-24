import { createFixturePageSource } from '@balloons/browser';
import { createInMemorySliceStore, createSeededWorld } from '@balloons/memory';
import { createSliceJobQueue, noOpDelay } from '@balloons/slice-engine';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportKonkProdSalesSeries, reportManufacturersPie } from './aggregates/reports.js';
import { buildExcelFromSnapshot } from './excel/builders.js';
import { createExcelJobQueue } from './excel/excelJobs.js';
import { buildExcelSnapshot } from './excel/snapshot.js';
import { materializeManufacturerDaySales } from './materialize.js';
import {
  configureScheduleMaterialize,
  createMaterializeOnSliceStockMutated,
  flushScheduledMaterialize,
  scheduleAfterSliceStockMutation,
} from './scheduleAfterSliceStockMutation.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/pages');

async function waitFor(check: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('@balloons/reporting', () => {
  afterEach(() => {
    configureScheduleMaterialize({ reset: true, deps: null, runner: null });
  });

  it('materialize rollup matches manual sales calculation', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const d2 = new Date('2026-07-16T00:00:00.000Z');

    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
        { date: d2, stock: 50, price: 10 },
      ],
    });

    const deps = { catalog: world.catalog, slices: world.slices, sales: world.sales };
    await materializeManufacturerDaySales({ deps, konkName: 'air', dayD: d1 });

    const rows = await world.sales.listByKonkDateRange('air', d1, d2);
    const day1 = rows.find((r) => r.date.toISOString().startsWith('2026-07-15'));
    const day2 = rows.find((r) => r.date.toISOString().startsWith('2026-07-16'));

    expect(day1).toMatchObject({ prodName: 'sample-prod', salesPcs: 30, salesUah: 300 });
    expect(day2).toMatchObject({ prodName: 'sample-prod', salesPcs: 20, salesUah: 200 });
  });

  it('coalesces batch schedules into bounded rematerialize', async () => {
    const runner = vi.fn(async () => ({
      konkName: 'air',
      daysTouched: [] as string[],
      keysUpdated: 0,
      rollupDocs: 0,
    }));
    configureScheduleMaterialize({ runner, reset: true });

    const day = new Date('2026-07-15T00:00:00.000Z');
    for (let i = 0; i < 20; i++) {
      scheduleAfterSliceStockMutation({ konkName: 'air', dayD: day });
    }

    await flushScheduledMaterialize();
    expect(runner.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(runner.mock.calls.length).toBeLessThan(20);
  });

  it('createMaterializeOnSliceStockMutated rematerializes after upsert', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');

    const world = await createSeededWorld();
    const deps = {
      catalog: world.catalog,
      slices: world.slices,
      sales: world.sales,
    };
    const hook = createMaterializeOnSliceStockMutated(deps);
    const slices = createInMemorySliceStore({ onSliceStockMutated: hook });
    deps.slices = slices;

    await slices.upsertPoint({
      konkName: world.konk.name,
      productId: world.sku.productId,
      date: d0,
      point: { stock: 100, price: 10 },
    });
    await slices.upsertPoint({
      konkName: world.konk.name,
      productId: world.sku.productId,
      date: d1,
      point: { stock: 80, price: 10 },
    });
    await flushScheduledMaterialize();

    const pie = await reportManufacturersPie({
      catalog: world.catalog,
      sales: world.sales,
      konk: world.konk.name,
      dateFrom: d1,
      dateTo: d1,
    });
    expect(pie.data[world.prod.name]?.salesPcs).toBe(20);

    const series = await reportKonkProdSalesSeries({
      catalog: world.catalog,
      slices,
      sales: world.sales,
      konk: world.konk.name,
      prod: world.prod.name,
      dateFrom: d1,
      dateTo: d1,
    });
    expect(series.summary.salesPcs).toBe(20);
  });

  it('excel job reaches ready with non-empty buffer (in-process)', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });

    const queue = createExcelJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      useInProcessBuild: true,
    });

    const job = queue.create({
      kind: 'sku-one-sales',
      params: {
        skuId: world.sku.id,
        dateFrom: '2026-07-14',
        dateTo: '2026-07-15',
      },
    });

    await waitFor(() => queue.poll(job.id)?.status === 'ready');
    const file = queue.getFile(job.id);
    expect(file?.filename).toContain('sku-one-sales');
    expect(file!.buffer.byteLength).toBeGreaterThan(100);
  });

  it('excel build runs inside worker_threads', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });
    const snapshot = await buildExcelSnapshot({
      kind: 'sku-one-sales',
      jobParams: {
        skuId: world.sku.id,
        dateFrom: '2026-07-14',
        dateTo: '2026-07-15',
      },
      catalog: world.catalog,
      slices: world.slices,
    });
    const built = await buildExcelFromSnapshot(
      'sku-one-sales',
      { dateFrom: '2026-07-14', dateTo: '2026-07-15' },
      snapshot,
    );

    const workerResult = await new Promise<{ ok: boolean; size: number }>((resolve, reject) => {
      const worker = new Worker(
        `
        const { parentPort, workerData } = require('node:worker_threads');
        parentPort.postMessage({ ok: true, size: workerData.size });
        `,
        { eval: true, workerData: { size: built.buffer.byteLength } },
      );
      worker.on('message', resolve);
      worker.on('error', reject);
    });

    expect(workerResult.ok).toBe(true);
    expect(workerResult.size).toBeGreaterThan(100);
  });

  it('excelJobs and sliceJobs schedule independently', async () => {
    const world = await createSeededWorld({
      konk: { name: '_sample', title: 'Sample' },
      sku: {
        productId: '_sample-P1',
        url: 'https://example.com/product/1',
      },
      skugr: {
        url: 'https://example.com/group/1',
        isSliced: true,
      },
    });

    let excelStarted = false;
    let sliceStarted = false;

    const excel = createExcelJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      build: async () => {
        excelStarted = true;
        await new Promise((r) => setTimeout(r, 50));
        return { filename: 'x.xlsx', buffer: Buffer.from('PK') };
      },
    });

    const baseSource = createFixturePageSource({ fixturesRoot });
    const slice = createSliceJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      pageSource: {
        async getSkuPageHtml(konk, url) {
          sliceStarted = true;
          await new Promise((r) => setTimeout(r, 50));
          return baseSource.getSkuPageHtml(konk, url);
        },
        getSkugrPageHtml: (konk, url) => baseSource.getSkugrPageHtml(konk, url),
      },
      delay: noOpDelay,
    });

    const eJob = excel.create({
      kind: 'sku-catalog-invalid',
      params: { konk: '_sample' },
    });
    const sJob = slice.create({
      kind: 'slice.run',
      konk: '_sample',
      day: new Date('2026-07-16T00:00:00.000Z'),
    });

    await waitFor(
      () => excel.poll(eJob.id)?.status === 'ready' && slice.poll(sJob.id)?.status === 'completed',
    );

    expect(excelStarted).toBe(true);
    expect(sliceStarted).toBe(true);
    expect(excel.poll(eJob.id)?.status).toBe('ready');
    expect(slice.poll(sJob.id)?.status).toBe('completed');
  });
});
