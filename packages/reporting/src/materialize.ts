import type {
  CatalogStore,
  ManufacturerDaySales,
  ManufacturerDaySalesStore,
  SlicePoint,
  SliceStore,
} from '@balloons/domain';
import { toSliceDate } from '@balloons/domain';
import { computePersistedDaySales } from './salesMath.js';
import { enumerateSliceDates, sliceDateMinusDays, sliceDatePlusDays } from './sliceDateShift.js';

export type MaterializeResult = {
  konkName: string;
  daysTouched: string[];
  keysUpdated: number;
  rollupDocs: number;
};

export type MaterializeDeps = {
  catalog: CatalogStore;
  slices: SliceStore;
  sales: ManufacturerDaySalesStore;
};

async function loadRecountDays(catalog: CatalogStore, konkName: string): Promise<Set<string>> {
  const konk = await catalog.getKonkByName(konkName);
  return new Set((konk?.recountDays ?? []).map(String));
}

async function loadProdNameByProductId(
  catalog: CatalogStore,
  konkName: string,
): Promise<Map<string, string>> {
  const skus = await catalog.listSkus({ konkName });
  const map = new Map<string, string>();
  for (const sku of skus) {
    if (!sku.productId || !sku.prodName) continue;
    map.set(sku.productId, sku.prodName);
  }
  return map;
}

async function loadDayMap(
  slices: SliceStore,
  konkName: string,
  day: Date,
): Promise<Map<string, SlicePoint>> {
  const rows = await slices.listPointsForDay(konkName, day);
  const map = new Map<string, SlicePoint>();
  for (const row of rows) map.set(row.productId, row.point);
  return map;
}

function computeProductSalesForDay(params: {
  day: Date;
  prevData: Map<string, SlicePoint>;
  currData: Map<string, SlicePoint>;
  recountDays: Set<string>;
}): Array<{ productId: string; salesPcs: number; salesUah: number }> {
  const { day, prevData, currData, recountDays } = params;
  const out: Array<{ productId: string; salesPcs: number; salesUah: number }> = [];

  for (const [productId, curr] of currData) {
    const prev = prevData.get(productId);
    const sales = computePersistedDaySales({
      prevStockRaw: prev?.stock,
      currStockRaw: curr.stock,
      currPriceRaw: curr.price,
      date: day,
      recountDays,
    });
    out.push({ productId, salesPcs: sales.salesPcs, salesUah: sales.salesUah });
  }
  return out;
}

async function replaceManufacturerDayRollup(params: {
  konkName: string;
  day: Date;
  prevData: Map<string, SlicePoint>;
  currData: Map<string, SlicePoint>;
  recountDays: Set<string>;
  prodNameByProductId: Map<string, string>;
  sales: ManufacturerDaySalesStore;
}): Promise<{ keysUpdated: number; rollupDocs: number }> {
  const { konkName, day, prevData, currData, recountDays, prodNameByProductId, sales } = params;

  if (currData.size === 0) {
    await sales.replaceDay(konkName, day, []);
    return { keysUpdated: 0, rollupDocs: 0 };
  }

  const productSales = computeProductSalesForDay({ day, prevData, currData, recountDays });
  const buckets = new Map<string, { salesPcs: number; salesUah: number }>();

  for (const row of productSales) {
    const prodName = prodNameByProductId.get(row.productId);
    if (!prodName) continue;
    const cur = buckets.get(prodName) ?? { salesPcs: 0, salesUah: 0 };
    cur.salesPcs += row.salesPcs;
    cur.salesUah += row.salesUah;
    buckets.set(prodName, cur);
  }

  const rows: ManufacturerDaySales[] = [...buckets.entries()].map(([prodName, totals]) => ({
    konkName,
    date: day,
    prodName,
    salesPcs: totals.salesPcs,
    salesUah: Math.round(totals.salesUah * 100) / 100,
  }));

  await sales.replaceDay(konkName, day, rows);
  return { keysUpdated: productSales.length, rollupDocs: rows.length };
}

/**
 * Materialize manufacturer day sales for D and D+1 (cascade).
 */
export async function materializeManufacturerDaySales(params: {
  deps: MaterializeDeps;
  konkName: string;
  dayD: Date;
}): Promise<MaterializeResult> {
  const { deps, konkName } = params;
  const dayD = toSliceDate(params.dayD);
  const dayNext = sliceDatePlusDays(dayD, 1);
  const dayPrev = sliceDateMinusDays(dayD, 1);

  const [recountDays, prodNameByProductId, prevData, dData, nextData] = await Promise.all([
    loadRecountDays(deps.catalog, konkName),
    loadProdNameByProductId(deps.catalog, konkName),
    loadDayMap(deps.slices, konkName, dayPrev),
    loadDayMap(deps.slices, konkName, dayD),
    loadDayMap(deps.slices, konkName, dayNext),
  ]);

  let keysUpdated = 0;
  let rollupDocs = 0;
  const daysTouched: string[] = [];

  if (dData.size > 0) {
    const r = await replaceManufacturerDayRollup({
      konkName,
      day: dayD,
      prevData,
      currData: dData,
      recountDays,
      prodNameByProductId,
      sales: deps.sales,
    });
    keysUpdated += r.keysUpdated;
    rollupDocs += r.rollupDocs;
    daysTouched.push(dayD.toISOString().slice(0, 10));
  } else {
    await deps.sales.replaceDay(konkName, dayD, []);
  }

  if (nextData.size > 0) {
    const r = await replaceManufacturerDayRollup({
      konkName,
      day: dayNext,
      prevData: dData,
      currData: nextData,
      recountDays,
      prodNameByProductId,
      sales: deps.sales,
    });
    keysUpdated += r.keysUpdated;
    rollupDocs += r.rollupDocs;
    daysTouched.push(dayNext.toISOString().slice(0, 10));
  }

  return { konkName, daysTouched, keysUpdated, rollupDocs };
}

/**
 * Backfill rollup over an inclusive date range (per-day full replace).
 */
export async function materializeManufacturerDaySalesDateRange(params: {
  deps: MaterializeDeps;
  konkName: string;
  fromDate: Date;
  toDate: Date;
}): Promise<MaterializeResult> {
  const { deps, konkName } = params;
  const dates = enumerateSliceDates(params.fromDate, params.toDate);
  let keysUpdated = 0;
  let rollupDocs = 0;
  const daysTouched: string[] = [];

  for (const day of dates) {
    const r = await materializeManufacturerDaySales({ deps, konkName, dayD: day });
    keysUpdated += r.keysUpdated;
    rollupDocs += r.rollupDocs;
    for (const d of r.daysTouched) {
      if (!daysTouched.includes(d)) daysTouched.push(d);
    }
  }

  return { konkName, daysTouched, keysUpdated, rollupDocs };
}
