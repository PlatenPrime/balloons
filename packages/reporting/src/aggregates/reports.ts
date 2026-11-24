import type { CatalogStore, ManufacturerDaySalesStore, SliceStore } from '@balloons/domain';
import { toSliceDate } from '@balloons/domain';
import { computeSharePercent } from '../salesMath.js';
import { resolveKonkProdSkus, resolveSelectionSkus, resolveSkugrWithSkus } from '../resolveSkus.js';
import {
  aggregateDailyStockForSkus,
  aggregatePeriodTotalsForSkus,
  aggregateSkuByDate,
  aggregateSkuDayMetrics,
  aggregateSkuRange,
  type PeriodSkuTotals,
  type SkuDayMetric,
} from './skuMetrics.js';

export type SalesPcsUah = { title: string; salesPcs: number; salesUah: number };

function emptyTotals(title: string): SalesPcsUah {
  return { title, salesPcs: 0, salesUah: 0 };
}

function addTotals(a: SalesPcsUah, pcs: number, uah: number): void {
  a.salesPcs += pcs;
  a.salesUah = Math.round((a.salesUah + uah) * 100) / 100;
}

export async function reportSkuByDate(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  skuId: string;
  date: Date;
}): Promise<{
  sales: number;
  revenue: number;
  price: number | null;
  isDeliveryDay: boolean;
} | null> {
  const row = await aggregateSkuByDate(params);
  if (!row) return null;
  return {
    sales: row.sales,
    revenue: row.revenue,
    price: row.price,
    isDeliveryDay: row.isDeliveryDay,
  };
}

export async function reportSkuRange(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  skuId: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<Array<{
  date: string;
  sales: number;
  revenue: number;
  price: number | null;
  isDeliveryDay: boolean;
}> | null> {
  const rows = await aggregateSkuRange(params);
  if (!rows) return null;
  return rows.map((r) => ({
    date: r.date,
    sales: r.sales,
    revenue: r.revenue,
    price: r.price,
    isDeliveryDay: r.isDeliveryDay,
  }));
}

export async function reportSkugrDailySummary(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  skugrId: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<Array<{ date: string; stock: number | null; sales: number; revenue: number }> | null> {
  const resolved = await resolveSkugrWithSkus(params.catalog, params.skugrId);
  if (!resolved) return null;

  const stockSeries = await aggregateDailyStockForSkus({
    slices: params.slices,
    skus: resolved.skus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  const perSkuDays = await Promise.all(
    resolved.skus.map((sku) =>
      aggregateSkuDayMetrics({
        catalog: params.catalog,
        slices: params.slices,
        sku,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      }),
    ),
  );

  return stockSeries.map((s, i) => {
    let sales = 0;
    let revenue = 0;
    for (const series of perSkuDays) {
      const d = series[i];
      if (!d) continue;
      sales += d.sales;
      revenue += d.revenue;
    }
    return {
      date: s.date,
      stock: s.stock,
      sales,
      revenue: Math.round(revenue * 100) / 100,
    };
  });
}

export async function reportSkugrSkusSales(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  skugrId: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<{
  skugrTitle: string;
  data: PeriodSkuTotals[];
  all: SalesPcsUah;
} | null> {
  const resolved = await resolveSkugrWithSkus(params.catalog, params.skugrId);
  if (!resolved) return null;
  const data = await aggregatePeriodTotalsForSkus({
    catalog: params.catalog,
    slices: params.slices,
    skus: resolved.skus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  const all = emptyTotals('all');
  for (const row of data) addTotals(all, row.salesPcs, row.salesUah);
  return { skugrTitle: resolved.skugr.title, data, all };
}

export async function reportKonkProdSkugrGroupsSales(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  konk: string;
  prod: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<{
  data: Array<{ skugrId: string; title: string; salesPcs: number; salesUah: number }>;
  all: SalesPcsUah;
} | null> {
  const groups = (await params.catalog.listSkugrs({ konkName: params.konk })).filter(
    (g) => g.prodName === params.prod,
  );
  const data: Array<{ skugrId: string; title: string; salesPcs: number; salesUah: number }> = [];
  const all = emptyTotals('all');

  for (const g of groups) {
    const skus = await resolveKonkProdSkus({
      catalog: params.catalog,
      konk: params.konk,
      prod: params.prod,
      skugrIds: [g.id],
    });
    const totals = await aggregatePeriodTotalsForSkus({
      catalog: params.catalog,
      slices: params.slices,
      skus,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    let salesPcs = 0;
    let salesUah = 0;
    for (const t of totals) {
      salesPcs += t.salesPcs;
      salesUah += t.salesUah;
    }
    salesUah = Math.round(salesUah * 100) / 100;
    data.push({ skugrId: g.id, title: g.title, salesPcs, salesUah });
    addTotals(all, salesPcs, salesUah);
  }

  return { data, all };
}

export type ChartDayRow = {
  date: string;
  stock: number | null;
  sales: number;
  revenue: number;
};

export async function reportKonkProdStockSeries(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  konk: string;
  prod: string;
  dateFrom: Date;
  dateTo: Date;
  skugrIds?: string[];
}): Promise<{
  days: Array<{ date: string; stock: number | null }>;
  summary: { stockLast: number | null };
}> {
  const skus = await resolveKonkProdSkus(params);
  const days = await aggregateDailyStockForSkus({
    slices: params.slices,
    skus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  const last = days[days.length - 1]?.stock ?? null;
  return { days, summary: { stockLast: last } };
}

export async function reportKonkProdSalesSeries(params: {
  catalog: CatalogStore;
  slices: SliceStore;
  sales: ManufacturerDaySalesStore;
  konk: string;
  prod: string;
  dateFrom: Date;
  dateTo: Date;
  skugrIds?: string[];
}): Promise<{ days: ChartDayRow[]; summary: { salesPcs: number; salesUah: number } }> {
  // With skugr filter — compute from SKUs; without — prefer manufacturer rollup.
  if (params.skugrIds?.length) {
    const skus = await resolveKonkProdSkus(params);
    const stockDays = await aggregateDailyStockForSkus({
      slices: params.slices,
      skus,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    const perSku = await Promise.all(
      skus.map((sku) =>
        aggregateSkuDayMetrics({
          catalog: params.catalog,
          slices: params.slices,
          sku,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        }),
      ),
    );
    const days: ChartDayRow[] = stockDays.map((s, i) => {
      let sales = 0;
      let revenue = 0;
      for (const series of perSku) {
        const d = series[i];
        if (!d) continue;
        sales += d.sales;
        revenue += d.revenue;
      }
      return {
        date: s.date,
        stock: s.stock,
        sales,
        revenue: Math.round(revenue * 100) / 100,
      };
    });
    const summary = { salesPcs: 0, salesUah: 0 };
    for (const d of days) {
      summary.salesPcs += d.sales;
      summary.salesUah += d.revenue;
    }
    summary.salesUah = Math.round(summary.salesUah * 100) / 100;
    return { days, summary };
  }

  const rollup = await params.sales.listByKonkDateRange(
    params.konk,
    params.dateFrom,
    params.dateTo,
  );
  const byDate = new Map<string, { salesPcs: number; salesUah: number }>();
  for (const row of rollup) {
    if (row.prodName !== params.prod) continue;
    const key = toSliceDate(row.date).toISOString().slice(0, 10);
    const cur = byDate.get(key) ?? { salesPcs: 0, salesUah: 0 };
    cur.salesPcs += row.salesPcs;
    cur.salesUah += row.salesUah;
    byDate.set(key, cur);
  }

  const skus = await resolveKonkProdSkus(params);
  const stockDays = await aggregateDailyStockForSkus({
    slices: params.slices,
    skus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  const days: ChartDayRow[] = stockDays.map((s) => {
    const r = byDate.get(s.date) ?? { salesPcs: 0, salesUah: 0 };
    return {
      date: s.date,
      stock: s.stock,
      sales: r.salesPcs,
      revenue: Math.round(r.salesUah * 100) / 100,
    };
  });
  const summary = { salesPcs: 0, salesUah: 0 };
  for (const d of days) {
    summary.salesPcs += d.sales;
    summary.salesUah += d.revenue;
  }
  summary.salesUah = Math.round(summary.salesUah * 100) / 100;
  return { days, summary };
}

export async function reportManufacturersPie(params: {
  catalog: CatalogStore;
  sales: ManufacturerDaySalesStore;
  konk: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<{ data: Record<string, SalesPcsUah>; all: SalesPcsUah }> {
  const rows = await params.sales.listByKonkDateRange(params.konk, params.dateFrom, params.dateTo);
  const prods = await params.catalog.listProds();
  const titleByName = new Map(prods.map((p) => [p.name, p.title]));
  const data: Record<string, SalesPcsUah> = {};
  const all = emptyTotals('all');

  for (const row of rows) {
    const title = titleByName.get(row.prodName) ?? row.prodName;
    const bucket = data[row.prodName] ?? emptyTotals(title);
    addTotals(bucket, row.salesPcs, row.salesUah);
    data[row.prodName] = bucket;
    addTotals(all, row.salesPcs, row.salesUah);
  }

  return { data, all };
}

export async function reportProdKonksPie(params: {
  catalog: CatalogStore;
  sales: ManufacturerDaySalesStore;
  prod: string;
  dateFrom: Date;
  dateTo: Date;
  excludeKonks?: string[];
}): Promise<{ data: Record<string, SalesPcsUah>; all: SalesPcsUah }> {
  const exclude = new Set((params.excludeKonks ?? []).map((k) => k.trim().toLowerCase()));
  const rows = await params.sales.listByProdDateRange(params.prod, params.dateFrom, params.dateTo);
  const konks = await params.catalog.listKonks();
  const titleByName = new Map(konks.map((k) => [k.name, k.title]));
  const data: Record<string, SalesPcsUah> = {};
  const all = emptyTotals('all');

  for (const row of rows) {
    if (exclude.has(row.konkName.toLowerCase())) continue;
    const title = titleByName.get(row.konkName) ?? row.konkName;
    const bucket = data[row.konkName] ?? emptyTotals(title);
    addTotals(bucket, row.salesPcs, row.salesUah);
    data[row.konkName] = bucket;
    addTotals(all, row.salesPcs, row.salesUah);
  }

  return { data, all };
}

export async function reportSelectionSkusPie(
  params: {
    catalog: CatalogStore;
    slices: SliceStore;
    dateFrom: Date;
    dateTo: Date;
  } & (
    | { skuIds: string[]; selectAll?: never }
    | {
        selectAll: true;
        search?: string;
        konkName?: string;
        prodName?: string;
      }
  ),
): Promise<{
  data: Record<string, PeriodSkuTotals & { sharePcs: number; shareUah: number }>;
  all: SalesPcsUah;
}> {
  const skus = await resolveSelectionSkus(
    'selectAll' in params && params.selectAll
      ? {
          catalog: params.catalog,
          selectAll: true as const,
          ...(params.search !== undefined ? { search: params.search } : {}),
          ...(params.konkName !== undefined ? { konkName: params.konkName } : {}),
          ...(params.prodName !== undefined ? { prodName: params.prodName } : {}),
        }
      : { catalog: params.catalog, skuIds: params.skuIds },
  );

  const totals = await aggregatePeriodTotalsForSkus({
    catalog: params.catalog,
    slices: params.slices,
    skus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  const all = emptyTotals('all');
  for (const t of totals) addTotals(all, t.salesPcs, t.salesUah);

  const data: Record<string, PeriodSkuTotals & { sharePcs: number; shareUah: number }> = {};
  for (const t of totals) {
    data[t.skuId] = {
      ...t,
      sharePcs: computeSharePercent(t.salesPcs, all.salesPcs),
      shareUah: computeSharePercent(t.salesUah, all.salesUah),
    };
  }

  return { data, all };
}

export type { SkuDayMetric, PeriodSkuTotals };
