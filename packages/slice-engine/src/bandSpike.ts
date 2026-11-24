import {
  isInvalidSlicePoint,
  toSliceDate,
  type CatalogStore,
  type SliceStore,
  type StockBand,
} from '@balloons/domain';

export type RtlBandStockDay = {
  dateMs: number;
  stock: number | undefined;
};

export type BandSpikeExitRun = {
  dateFromMs: number;
  dateToMs: number;
  peakStock: number;
};

export type DiscoverBandSpikeItem = {
  productId: string;
  runs: BandSpikeExitRun[];
};

export type DiscoverBandSpikeResult = {
  konkName: string;
  window: { dateFrom: Date; dateTo: Date };
  band: { min: number; max: number; normalMax?: number };
  items: DiscoverBandSpikeItem[];
};

export type RtlBandSpikePatch = {
  dateMs: number;
  from: number;
  to: number;
};

export type RtlBandSpikeSkipReason =
  'missing-left' | 'missing-right' | 'not-sandwich-left' | 'not-sandwich-right';

export type RtlBandSpikeSkip = {
  dateFromMs: number;
  dateToMs: number;
  reason: RtlBandSpikeSkipReason;
};

export type RtlBandSpikeComputeResult = {
  patches: RtlBandSpikePatch[];
  skipped: RtlBandSpikeSkip[];
};

export type RtlBandSpikeBand = {
  bandMin: number;
  bandMax: number;
  normalMax?: number;
};

export type CorrectBandSpikeResult = {
  productId: string;
  preview: RtlBandSpikeComputeResult;
  applied: number;
};

function addUtcDays(date: Date, days: number): Date {
  const d = toSliceDate(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

function enumerateDates(from: Date, to: Date): Date[] {
  const start = toSliceDate(from);
  const end = toSliceDate(to);
  const out: Date[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addUtcDays(d, 1)) {
    out.push(d);
  }
  return out;
}

export function isManualBandStock(stock: number, bandMin: number, bandMax: number): boolean {
  return stock >= bandMin && stock <= bandMax;
}

export function isManualSmallStock(stock: number, bandMin: number): boolean {
  return Number.isFinite(stock) && stock !== -1 && stock < bandMin;
}

export function isNormalStock(stock: number, normalMax: number): boolean {
  return Number.isFinite(stock) && stock !== -1 && stock <= normalMax;
}

export function isSandwichAnchor(stock: number, band: RtlBandSpikeBand): boolean {
  if (band.normalMax !== undefined) {
    return isNormalStock(stock, band.normalMax);
  }
  return isManualSmallStock(stock, band.bandMin);
}

type BandRun = { startIndex: number; endIndex: number };

export function findBandRunsInWindow(
  series: RtlBandStockDay[],
  windowStartMs: number,
  windowEndMs: number,
  bandMin: number,
  bandMax: number,
): BandRun[] {
  const runs: BandRun[] = [];
  let runStart: number | null = null;

  for (let i = 0; i < series.length; i++) {
    const day = series[i]!;
    const inWindow = day.dateMs >= windowStartMs && day.dateMs <= windowEndMs;
    const stock = day.stock;
    const inBand =
      inWindow &&
      typeof stock === 'number' &&
      Number.isFinite(stock) &&
      isManualBandStock(stock, bandMin, bandMax);

    if (inBand) {
      if (runStart === null) runStart = i;
      continue;
    }

    if (runStart !== null) {
      runs.push({ startIndex: runStart, endIndex: i - 1 });
      runStart = null;
    }
  }

  if (runStart !== null) {
    runs.push({ startIndex: runStart, endIndex: series.length - 1 });
  }

  return runs;
}

function readFiniteStock(day: RtlBandStockDay | undefined): number | undefined {
  const stock = day?.stock;
  return typeof stock === 'number' && Number.isFinite(stock) ? stock : undefined;
}

export function detectBandSpikeExits(
  series: RtlBandStockDay[],
  windowStartMs: number,
  windowEndMs: number,
  bandMin: number,
  bandMax: number,
  normalMax?: number,
): BandSpikeExitRun[] {
  const runs = findBandRunsInWindow(series, windowStartMs, windowEndMs, bandMin, bandMax);
  const out: BandSpikeExitRun[] = [];
  const sandwichBand: RtlBandSpikeBand | undefined =
    normalMax !== undefined ? { bandMin, bandMax, normalMax } : undefined;

  for (const run of runs) {
    const exitDay = series[run.endIndex + 1];
    const exitStock = readFiniteStock(exitDay);
    if (exitStock === undefined) {
      continue;
    }

    if (sandwichBand) {
      if (!isSandwichAnchor(exitStock, sandwichBand)) {
        continue;
      }
      const leftStock = readFiniteStock(series[run.startIndex - 1]);
      if (leftStock !== undefined && !isSandwichAnchor(leftStock, sandwichBand)) {
        continue;
      }
    } else if (isManualBandStock(exitStock, bandMin, bandMax)) {
      continue;
    }

    let peakStock = Number.NEGATIVE_INFINITY;
    for (let i = run.startIndex; i <= run.endIndex; i++) {
      const stock = series[i]!.stock!;
      if (stock > peakStock) peakStock = stock;
    }

    out.push({
      dateFromMs: series[run.startIndex]!.dateMs,
      dateToMs: series[run.endIndex]!.dateMs,
      peakStock,
    });
  }

  return out;
}

export function computeRtlBandSpikePatches(
  series: RtlBandStockDay[],
  windowStartMs: number,
  windowEndMs: number,
  band: RtlBandSpikeBand,
): RtlBandSpikeComputeResult {
  const { bandMin, bandMax } = band;
  const patches: RtlBandSpikePatch[] = [];
  const skipped: RtlBandSpikeSkip[] = [];
  const runs = findBandRunsInWindow(series, windowStartMs, windowEndMs, bandMin, bandMax);

  for (const run of runs) {
    const leftDay = series[run.startIndex - 1];
    const rightDay = series[run.endIndex + 1];
    const leftStock = readFiniteStock(leftDay);
    const rightStock = readFiniteStock(rightDay);
    const runFromMs = series[run.startIndex]!.dateMs;
    const runToMs = series[run.endIndex]!.dateMs;

    if (rightStock === undefined) {
      skipped.push({ dateFromMs: runFromMs, dateToMs: runToMs, reason: 'missing-right' });
      continue;
    }
    if (!isSandwichAnchor(rightStock, band)) {
      skipped.push({ dateFromMs: runFromMs, dateToMs: runToMs, reason: 'not-sandwich-right' });
      continue;
    }
    if (leftStock !== undefined && !isSandwichAnchor(leftStock, band)) {
      skipped.push({ dateFromMs: runFromMs, dateToMs: runToMs, reason: 'not-sandwich-left' });
      continue;
    }

    const corrected: number[] = new Array(run.endIndex - run.startIndex + 1);
    corrected[corrected.length - 1] = rightStock;

    for (let offset = corrected.length - 2; offset >= 0; offset--) {
      const seriesIndex = run.startIndex + offset;
      const orig = series[seriesIndex]!.stock!;
      const origNext = series[seriesIndex + 1]!.stock!;
      const sales = Math.max(0, orig - origNext);
      corrected[offset] = corrected[offset + 1]! + sales;
    }

    for (let offset = 0; offset < corrected.length; offset++) {
      const seriesIndex = run.startIndex + offset;
      const from = series[seriesIndex]!.stock!;
      const to = corrected[offset]!;
      if (from === to) continue;
      patches.push({
        dateMs: series[seriesIndex]!.dateMs,
        from,
        to,
      });
    }
  }

  return { patches, skipped };
}

async function loadStockSeries(
  slices: SliceStore,
  konkName: string,
  productId: string,
  dates: Date[],
): Promise<RtlBandStockDay[]> {
  const out: RtlBandStockDay[] = [];
  for (const date of dates) {
    const point = await slices.getPoint(konkName, productId, date);
    const stock =
      point && !isInvalidSlicePoint(point) && Number.isFinite(point.stock)
        ? point.stock
        : undefined;
    out.push({ dateMs: toSliceDate(date).getTime(), stock });
  }
  return out;
}

export async function discoverBandSpike(input: {
  konk: string;
  productIds: string[];
  dateFrom: Date;
  dateTo: Date;
  stockMin: number;
  stockMax: number;
  normalMax?: number;
  slices: SliceStore;
}): Promise<DiscoverBandSpikeResult> {
  const dateFrom = toSliceDate(input.dateFrom);
  const dateTo = toSliceDate(input.dateTo);
  const loadFrom = input.normalMax !== undefined ? addUtcDays(dateFrom, -1) : dateFrom;
  const loadTo = addUtcDays(dateTo, 1);
  const loadDates = enumerateDates(loadFrom, loadTo);
  const items: DiscoverBandSpikeItem[] = [];

  for (const productId of input.productIds) {
    const series = await loadStockSeries(input.slices, input.konk, productId, loadDates);
    const runs = detectBandSpikeExits(
      series,
      dateFrom.getTime(),
      dateTo.getTime(),
      input.stockMin,
      input.stockMax,
      input.normalMax,
    );
    if (runs.length === 0) continue;
    items.push({ productId, runs });
  }

  const band: DiscoverBandSpikeResult['band'] = {
    min: input.stockMin,
    max: input.stockMax,
  };
  if (input.normalMax !== undefined) {
    band.normalMax = input.normalMax;
  }

  return {
    konkName: input.konk,
    window: { dateFrom, dateTo },
    band,
    items,
  };
}

export async function correctBandSpikeRtl(input: {
  konk: string;
  productId: string;
  dateFrom: Date;
  dateTo: Date;
  band: RtlBandSpikeBand;
  slices: SliceStore;
  apply?: boolean;
}): Promise<CorrectBandSpikeResult> {
  const dateFrom = toSliceDate(input.dateFrom);
  const dateTo = toSliceDate(input.dateTo);
  const loadFrom = addUtcDays(dateFrom, -1);
  const loadTo = addUtcDays(dateTo, 1);
  const loadDates = enumerateDates(loadFrom, loadTo);
  const series = await loadStockSeries(input.slices, input.konk, input.productId, loadDates);
  const preview = computeRtlBandSpikePatches(
    series,
    dateFrom.getTime(),
    dateTo.getTime(),
    input.band,
  );

  let applied = 0;
  if (input.apply) {
    for (const patch of preview.patches) {
      const date = new Date(patch.dateMs);
      const existing = await input.slices.getPoint(input.konk, input.productId, date);
      const price = existing && !isInvalidSlicePoint(existing) ? existing.price : -1;
      await input.slices.upsertPoint({
        konkName: input.konk,
        productId: input.productId,
        date,
        point: { stock: patch.to, price },
      });
      applied += 1;
    }
  }

  return { productId: input.productId, preview, applied };
}

export async function discoverStockBand(input: {
  band: StockBand;
  productIds: string[];
  dateFrom: Date;
  dateTo: Date;
  slices: SliceStore;
}): Promise<DiscoverBandSpikeResult> {
  return discoverBandSpike({
    konk: input.band.konk.name,
    productIds: input.productIds,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    stockMin: input.band.stockMin,
    stockMax: input.band.stockMax,
    normalMax: input.band.normalMax,
    slices: input.slices,
  });
}

export async function batchCorrectStockBand(input: {
  catalog: CatalogStore;
  slices: SliceStore;
  bandId: string;
  productIds: string[];
  dateFrom: Date;
  dateTo: Date;
  signal?: AbortSignal;
}): Promise<{ bandId: string; corrected: number; skipped: number }> {
  const band = await input.catalog.getStockBandById(input.bandId);
  if (!band) {
    throw new Error(`StockBand not found: ${input.bandId}`);
  }

  let corrected = 0;
  let skipped = 0;

  for (const productId of input.productIds) {
    if (input.signal?.aborted) {
      const err = new Error('Batch correct aborted');
      err.name = 'AbortError';
      throw err;
    }
    const result = await correctBandSpikeRtl({
      konk: band.konk.name,
      productId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      band: {
        bandMin: band.stockMin,
        bandMax: band.stockMax,
        normalMax: band.normalMax,
      },
      slices: input.slices,
      apply: true,
    });
    corrected += result.applied;
    skipped += result.preview.skipped.length;
  }

  return { bandId: input.bandId, corrected, skipped };
}
