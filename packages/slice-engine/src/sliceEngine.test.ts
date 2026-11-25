import { createFixturePageSource } from '@balloons/browser';
import { isInvalidSlicePoint, toSliceDate, type PageSource } from '@balloons/domain';
import { createSeededWorld } from '@balloons/memory';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  applyPackFlips,
  batchCorrectStockBand,
  createSliceJobQueue,
  discoverBandSpike,
  ingestHtml,
  listPending,
  noOpDelay,
  previewPackFlips,
  runCompensationForKonk,
  runSliceForKonk,
  type SliceEngineDeps,
} from './index.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/pages');

function fixtureDeps(
  world: Awaited<ReturnType<typeof createSeededWorld>>,
  pageSource: PageSource = createFixturePageSource({ fixturesRoot }),
): SliceEngineDeps {
  return {
    catalog: world.catalog,
    slices: world.slices,
    pageSource,
    delay: noOpDelay,
  };
}

async function seedSampleWorld(
  options: Parameters<typeof createSeededWorld>[0] = {},
): Promise<Awaited<ReturnType<typeof createSeededWorld>>> {
  return createSeededWorld({
    konk: { name: '_sample', title: 'Sample' },
    sku: {
      productId: '_sample-P1',
      url: 'https://example.com/product/1',
    },
    skugr: {
      url: 'https://example.com/group/1',
      isSliced: true,
    },
    ...options,
  });
}

describe('slice-engine DoD', () => {
  it('runs fixture day → points → pending/ingest → pack-flip/band preview', async () => {
    const onSliceStockMutated = vi.fn();
    const day = new Date('2026-07-14T12:00:00.000Z');
    const world = await seedSampleWorld({
      sliceStoreOptions: { onSliceStockMutated },
    });
    const deps = fixtureDeps(world);

    const run = await runSliceForKonk({ konk: '_sample', day, deps });
    expect(run.filled).toBe(1);
    expect(run.invalid).toBe(0);
    expect(run.abortReason).toBeUndefined();

    const point = await world.slices.getPoint('_sample', '_sample-P1', day);
    expect(point).toEqual({ stock: 10, price: 99.5 });

    const meta = await world.slices.getDayMeta('_sample', day);
    expect(meta?.stats).toMatchObject({
      filled: 1,
      invalid: 0,
      errorCount: 0,
      dueTotal: 1,
    });
    expect(onSliceStockMutated).toHaveBeenCalled();

    // Second run skips valid points (no extra fetch).
    const fetchSpy = vi.fn(deps.pageSource.getSkuPageHtml.bind(deps.pageSource));
    const depsSpy: SliceEngineDeps = {
      ...deps,
      pageSource: {
        getSkuPageHtml: fetchSpy,
        getSkugrPageHtml: deps.pageSource.getSkugrPageHtml.bind(deps.pageSource),
      },
    };
    const second = await runSliceForKonk({ konk: '_sample', day, deps: depsSpy });
    expect(second.skippedValid).toBe(1);
    expect(second.filled).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();

    // Soft-fail + compensation path on another day.
    const failDay = new Date('2026-07-15T12:00:00.000Z');
    const broken: PageSource = {
      async getSkuPageHtml() {
        return '<html><body>no metrics</body></html>';
      },
      async getSkugrPageHtml() {
        return '';
      },
    };
    const failRun = await runSliceForKonk({
      konk: '_sample',
      day: failDay,
      deps: { ...deps, pageSource: broken },
    });
    expect(failRun.invalid).toBe(1);
    expect(isInvalidSlicePoint(await world.slices.getPoint('_sample', '_sample-P1', failDay))).toBe(
      true,
    );

    const compensated = await runCompensationForKonk({
      konk: '_sample',
      day: failDay,
      deps,
    });
    expect(compensated.filled).toBe(1);
    expect(await world.slices.getPoint('_sample', '_sample-P1', failDay)).toEqual({
      stock: 10,
      price: 99.5,
    });

    // Client-ingest: clear open day and refill via HTML.
    const openNow = new Date('2026-07-14T10:00:00.000Z'); // before 20:00 Kyiv → calendar day
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: openNow,
      point: { stock: -1, price: -1 },
    });
    const pending = await listPending({
      konk: '_sample',
      catalog: world.catalog,
      slices: world.slices,
      now: openNow,
    });
    expect(pending.items).toHaveLength(1);

    const html = await deps.pageSource.getSkuPageHtml('_sample', world.sku.url);
    const ingested = await ingestHtml({
      konk: '_sample',
      skuId: world.sku.id,
      html,
      sourceUrl: world.sku.url,
      catalog: world.catalog,
      slices: world.slices,
      now: openNow,
    });
    expect(ingested).toMatchObject({ ok: true, status: 'saved', stock: 10, price: 99.5 });

    // Pack-flip preview/apply on synthetic series.
    const d0 = toSliceDate(new Date('2026-08-01T00:00:00.000Z'));
    const d1 = toSliceDate(new Date('2026-08-02T00:00:00.000Z'));
    const d2 = toSliceDate(new Date('2026-08-03T00:00:00.000Z'));
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: d0,
      point: { stock: 10, price: 100 },
    });
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: d1,
      point: { stock: 20, price: 50 },
    });
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: d2,
      point: { stock: 10, price: 100 },
    });

    const flipPreview = await previewPackFlips({
      konk: '_sample',
      productIds: ['_sample-P1'],
      dateFrom: d0,
      dateTo: d2,
      slices: world.slices,
    });
    expect(flipPreview.items[0]?.decisions[0]?.patched).toEqual({ stock: 10, price: 100 });

    const flipApply = await applyPackFlips({
      konk: '_sample',
      productIds: ['_sample-P1'],
      dateFrom: d0,
      dateTo: d2,
      slices: world.slices,
    });
    expect(flipApply.applied).toBe(1);
    expect(await world.slices.getPoint('_sample', '_sample-P1', d1)).toEqual({
      stock: 10,
      price: 100,
    });

    // Band-spike discover (sandwich) + batch-correct via job queue.
    const b0 = toSliceDate(new Date('2026-09-01T00:00:00.000Z'));
    const b1 = toSliceDate(new Date('2026-09-02T00:00:00.000Z'));
    const b2 = toSliceDate(new Date('2026-09-03T00:00:00.000Z'));
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: b0,
      point: { stock: 20, price: 10 },
    });
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: b1,
      point: { stock: 150, price: 10 },
    });
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: b2,
      point: { stock: 15, price: 10 },
    });

    const bandDiscover = await discoverBandSpike({
      konk: '_sample',
      productIds: ['_sample-P1'],
      dateFrom: b1,
      dateTo: b1,
      stockMin: 100,
      stockMax: 200,
      normalMax: 50,
      slices: world.slices,
    });
    expect(bandDiscover.items).toHaveLength(1);

    const queue = createSliceJobQueue(deps);
    const job = queue.create({
      kind: 'stock-band.batch-correct',
      bandId: world.stockBand.id,
      productIds: ['_sample-P1'],
      dateFrom: b1,
      dateTo: b1,
    });

    let polled = queue.poll(job.id);
    for (let i = 0; i < 50 && polled && polled.status === 'queued'; i++) {
      await Promise.resolve();
      polled = queue.poll(job.id);
    }
    for (let i = 0; i < 50 && polled && polled.status === 'running'; i++) {
      await new Promise((r) => setTimeout(r, 5));
      polled = queue.poll(job.id);
    }
    expect(polled?.status).toBe('completed');

    const corrected = await world.slices.getPoint('_sample', '_sample-P1', b1);
    expect(corrected?.stock).toBe(15);
  });

  it('aborts after consecutive soft-invalids from config', async () => {
    const world = await seedSampleWorld({
      sku: {
        id: 'sku-a',
        productId: '_sample-P1',
        url: 'https://example.com/product/1',
      },
      skugr: { skuIds: ['sku-a', 'sku-b'] },
    });
    await world.catalog.seedSku({
      id: 'sku-b',
      konkName: '_sample',
      prodName: world.prod.name,
      productId: '_sample-P2',
      artikul: 'A2',
      title: 'SKU 2',
      url: 'https://example.com/product/2',
      imageUrl: '',
      isInvalid: false,
    });

    const broken: PageSource = {
      async getSkuPageHtml() {
        return '<html></html>';
      },
      async getSkugrPageHtml() {
        return '';
      },
    };

    const result = await runSliceForKonk({
      konk: '_sample',
      day: new Date('2026-07-20T12:00:00.000Z'),
      deps: {
        ...fixtureDeps(world, broken),
        getScrapeProfile: () => ({
          requestJitter: { minMs: 0, maxMs: 0 },
          consecutiveInvalidAbort: 1,
        }),
      },
    });

    expect(result.abortReason).toBe('consecutive_invalid');
    expect(result.invalid).toBe(1);
    const meta = await world.slices.getDayMeta('_sample', new Date('2026-07-20T12:00:00.000Z'));
    expect(meta?.stats?.abortReason).toBe('consecutive_invalid');
  });

  it('cancels a queued slice job', async () => {
    const world = await seedSampleWorld();
    const deps = fixtureDeps(world);
    const queue = createSliceJobQueue(deps);

    // Slow first job keeps the queue busy.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slowSource: PageSource = {
      async getSkuPageHtml(konk, url) {
        await gate;
        return deps.pageSource.getSkuPageHtml(konk, url);
      },
      getSkugrPageHtml: deps.pageSource.getSkugrPageHtml.bind(deps.pageSource),
    };
    const slowQueue = createSliceJobQueue({ ...deps, pageSource: slowSource });

    const first = slowQueue.create({
      kind: 'slice.run',
      konk: '_sample',
      day: new Date('2026-07-21T12:00:00.000Z'),
    });
    const second = slowQueue.create({
      kind: 'slice.run',
      konk: '_sample',
      day: new Date('2026-07-22T12:00:00.000Z'),
    });

    expect(slowQueue.cancel(second.id)).toBe(true);
    expect(slowQueue.poll(second.id)?.status).toBe('cancelled');
    release();

    let polled = slowQueue.poll(first.id);
    for (let i = 0; i < 50 && polled && polled.status !== 'completed'; i++) {
      await new Promise((r) => setTimeout(r, 5));
      polled = slowQueue.poll(first.id);
    }
    expect(polled?.status).toBe('completed');

    // Sanity: queue API on idle queue
    const idle = queue.create({
      kind: 'compensation.run',
      konk: '_sample',
      day: new Date('2026-07-23T12:00:00.000Z'),
    });
    expect(queue.poll(idle.id)?.kind).toBe('compensation.run');
  });

  it('batchCorrectStockBand applies RTL patches', async () => {
    const world = await seedSampleWorld({
      stockBand: { stockMin: 100, stockMax: 200, normalMax: 50 },
    });
    const b0 = toSliceDate(new Date('2026-10-01T00:00:00.000Z'));
    const b1 = toSliceDate(new Date('2026-10-02T00:00:00.000Z'));
    const b2 = toSliceDate(new Date('2026-10-03T00:00:00.000Z'));
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: b0,
      point: { stock: 10, price: 5 },
    });
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: b1,
      point: { stock: 120, price: 5 },
    });
    await world.slices.upsertPoint({
      konkName: '_sample',
      productId: '_sample-P1',
      date: b2,
      point: { stock: 8, price: 5 },
    });

    const result = await batchCorrectStockBand({
      catalog: world.catalog,
      slices: world.slices,
      bandId: world.stockBand.id,
      productIds: ['_sample-P1'],
      dateFrom: b1,
      dateTo: b1,
    });
    expect(result.corrected).toBe(1);
    expect(await world.slices.getPoint('_sample', '_sample-P1', b1)).toEqual({
      stock: 8,
      price: 5,
    });
  });
});
