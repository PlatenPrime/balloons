import type { CatalogStore, SliceStore, Sku } from '@balloons/domain';
import { toSliceDate } from '@balloons/domain';
import { coalesceSlicePointsAlongDates } from '../coalescePoints.js';
import {
  applyRecountDayToSales,
  computePersistedDaySales,
  computeRevenueForDay,
  computeSalesFromStockSequence,
} from '../salesMath.js';
import { enumerateSliceDates, sliceDateMinusDays } from '../sliceDateShift.js';

export type SkuDayMetric = {
  date: string;
  sales: number;
  revenue: number;
  price: number | null;
  stock: number | null;
  isDeliveryDay: boolean;
};

async function loadRecountDays(catalog: CatalogStore, konkName: string): Promise<Set<string>> {
  const konk = await catalog.getKonkByName(konkName);
  return new Set((konk?.recountDays ?? []).map(String));
}

/**
 * Daily metrics for one SKU over a range (write-path sales rules + coalesced stock/price).
 */
export async function aggregateSkuDayMetrics(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  sku: Sku;
  dateFrom: Date;
  dateTo: Date;
}): Promise<SkuDayMetric[]> {
  const { catalog, slices, sku } = params;
  const dates = enumerateSliceDates(params.dateFrom, params.dateTo);
  if (dates.length === 0) return [];

  const recountDays = await loadRecountDays(catalog, sku.konkName);
  const first = dates[0]!;
  const prevDay = sliceDateMinusDays(first, 1);

  const ranged = await slices.listPointsForProductRange(
    sku.konkName,
    sku.productId,
    prevDay,
    params.dateTo,
  );
  const byIso = new Map(ranged.map((r) => [r.date.toISOString(), r.point]));

  const pointMap = new Map(
    dates.map((d) => [d.toISOString(), byIso.get(d.toISOString()) ?? null] as const),
  );
  const coalesced = coalesceSlicePointsAlongDates(dates, (d) => pointMap.get(d.toISOString()));

  const prevPoint = byIso.get(prevDay.toISOString());
  let prevStockRaw: unknown = prevPoint?.stock;

  const out: SkuDayMetric[] = [];
  for (let i = 0; i < dates.length; i++) {
    const day = dates[i]!;
    const raw = pointMap.get(day.toISOString()) ?? null;
    const persisted = computePersistedDaySales({
      prevStockRaw,
      currStockRaw: raw?.stock,
      currPriceRaw: raw?.price,
      date: day,
      recountDays,
    });

    if (raw != null) prevStockRaw = raw.stock;

    const c = coalesced[i]!;
    out.push({
      date: day.toISOString().slice(0, 10),
      sales: persisted.salesPcs,
      revenue: persisted.salesUah,
      price: c.price,
      stock: c.stock,
      isDeliveryDay: persisted.isDeliveryDay,
    });
  }

  return out;
}

export async function aggregateSkuByDate(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  skuId: string;
  date: Date;
}): Promise<SkuDayMetric | null> {
  const sku = await params.catalog.getSkuById(params.skuId);
  if (!sku) return null;
  const day = toSliceDate(params.date);
  const rows = await aggregateSkuDayMetrics({
    catalog: params.catalog,
    slices: params.slices,
    sku,
    dateFrom: day,
    dateTo: day,
  });
  return rows[0] ?? null;
}

export async function aggregateSkuRange(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  skuId: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<SkuDayMetric[] | null> {
  const sku = await params.catalog.getSkuById(params.skuId);
  if (!sku) return null;
  return aggregateSkuDayMetrics({ ...params, sku });
}

export type PeriodSkuTotals = {
  skuId: string;
  title: string;
  productId: string;
  artikul: string;
  imageUrl: string;
  konkName: string;
  salesPcs: number;
  salesUah: number;
};

export async function aggregatePeriodTotalsForSkus(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  skus: Sku[];
  dateFrom: Date;
  dateTo: Date;
}): Promise<PeriodSkuTotals[]> {
  const out: PeriodSkuTotals[] = [];
  for (const sku of params.skus) {
    const days = await aggregateSkuDayMetrics({
      catalog: params.catalog,
      slices: params.slices,
      sku,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    let salesPcs = 0;
    let salesUah = 0;
    for (const d of days) {
      salesPcs += d.sales;
      salesUah += d.revenue;
    }
    out.push({
      skuId: sku.id,
      title: sku.title,
      productId: sku.productId,
      artikul: sku.artikul,
      imageUrl: sku.imageUrl,
      konkName: sku.konkName,
      salesPcs,
      salesUah: Math.round(salesUah * 100) / 100,
    });
  }
  return out;
}

/** Coalesced stock series for a set of SKUs (sum stock per day). */
export async function aggregateDailyStockForSkus(params: {
  slices: SliceStore;
  skus: Sku[];
  dateFrom: Date;
  dateTo: Date;
}): Promise<Array<{ date: string; stock: number | null }>> {
  const dates = enumerateSliceDates(params.dateFrom, params.dateTo);
  const perSku = await Promise.all(
    params.skus.map(async (sku) => {
      const ranged = await params.slices.listPointsForProductRange(
        sku.konkName,
        sku.productId,
        params.dateFrom,
        params.dateTo,
      );
      const byIso = new Map(ranged.map((r) => [r.date.toISOString(), r.point]));
      return coalesceSlicePointsAlongDates(dates, (d) => byIso.get(d.toISOString()) ?? null);
    }),
  );

  return dates.map((d, i) => {
    let sum = 0;
    let any = false;
    for (const series of perSku) {
      const s = series[i]?.stock;
      if (s != null) {
        sum += s;
        any = true;
      }
    }
    return { date: d.toISOString().slice(0, 10), stock: any ? sum : null };
  });
}

/**
 * Daily sales sum for SKUs using coalesced stock deltas (Excel/range display path).
 * Prefer `aggregateSkuDayMetrics` for write-path parity.
 */
export function salesFromCoalescedStockSequence(
  stocks: (number | null)[],
  prices: (number | null)[],
  dates: Date[],
  recountDays: ReadonlySet<string>,
): Array<{ sales: number; revenue: number; isDeliveryDay: boolean }> {
  const seq = computeSalesFromStockSequence(stocks);
  return seq.map((day, i) => {
    let sales = day.sales;
    const date = dates[i]!;
    sales = applyRecountDayToSales(sales, date, recountDays);
    return {
      sales,
      revenue: computeRevenueForDay(sales, prices[i] ?? null),
      isDeliveryDay: day.isDeliveryDay,
    };
  });
}
