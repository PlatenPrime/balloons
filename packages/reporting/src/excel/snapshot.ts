import type {
  CatalogStore,
  Konk,
  Prod,
  Sku,
  Skugr,
  SlicePoint,
  SliceStore,
} from '@balloons/domain';
import { toSliceDate } from '@balloons/domain';
import type { ExcelSkuKind } from './kinds.js';

export type ExcelSlicePointRow = {
  konkName: string;
  productId: string;
  date: string;
  stock: number;
  price: number;
};

export type ExcelSnapshot = {
  konks: Konk[];
  prods: Prod[];
  skus: Sku[];
  skugrs: Skugr[];
  points: ExcelSlicePointRow[];
};

function ymd(d: Date): string {
  return toSliceDate(d).toISOString().slice(0, 10);
}

function parseYmd(s: unknown): Date | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T00:00:00.000Z`);
}

async function collectPointsForSkus(
  slices: SliceStore,
  skus: Sku[],
  from: Date,
  to: Date,
): Promise<ExcelSlicePointRow[]> {
  const out: ExcelSlicePointRow[] = [];
  for (const sku of skus) {
    const rows = await slices.listPointsForProductRange(sku.konkName, sku.productId, from, to);
    for (const r of rows) {
      out.push({
        konkName: sku.konkName,
        productId: sku.productId,
        date: ymd(r.date),
        stock: r.point.stock,
        price: r.point.price,
      });
    }
  }
  return out;
}

/**
 * Build a serializable snapshot for an excel kind (main thread → worker).
 */
export async function buildExcelSnapshot(params: {
  kind: ExcelSkuKind;
  jobParams: Record<string, unknown>;
  catalog: CatalogStore;
  slices: SliceStore;
}): Promise<ExcelSnapshot> {
  const { kind, jobParams, catalog, slices } = params;
  const konks = await catalog.listKonks();
  const prods = await catalog.listProds();
  let skus = await catalog.listSkus();
  const skugrs = await catalog.listSkugrs();
  let points: ExcelSlicePointRow[] = [];

  const dateFrom = parseYmd(jobParams.dateFrom);
  const dateTo = parseYmd(jobParams.dateTo);

  switch (kind) {
    case 'sku-catalog-invalid': {
      const konk = typeof jobParams.konk === 'string' ? jobParams.konk : 'all';
      skus =
        konk === 'all'
          ? skus.filter((s) => s.isInvalid)
          : skus.filter((s) => s.konkName === konk && s.isInvalid);
      break;
    }
    case 'sku-catalog-new-since': {
      // Sandbox: no createdAt — export all (or filtered by konk) as catalog dump.
      const konk = typeof jobParams.konk === 'string' ? jobParams.konk : 'all';
      if (konk !== 'all') skus = skus.filter((s) => s.konkName === konk);
      break;
    }
    case 'sku-one-stock':
    case 'sku-one-sales': {
      const skuId = String(jobParams.skuId ?? '');
      skus = skus.filter((s) => s.id === skuId);
      if (dateFrom && dateTo) points = await collectPointsForSkus(slices, skus, dateFrom, dateTo);
      break;
    }
    case 'sku-skugr-stock':
    case 'sku-skugr-sales':
    case 'sku-skugr-skus-share': {
      const skugrId = String(jobParams.skugrId ?? '');
      const g = skugrs.find((x) => x.id === skugrId);
      const idSet = new Set(g?.skuIds ?? []);
      skus = skus.filter((s) => idSet.has(s.id));
      if (dateFrom && dateTo) points = await collectPointsForSkus(slices, skus, dateFrom, dateTo);
      break;
    }
    case 'sku-konk-stock':
    case 'sku-konk-sales': {
      const konk = String(jobParams.konk ?? '');
      const prod = String(jobParams.prod ?? '');
      skus = skus.filter((s) => s.konkName === konk && s.prodName === prod);
      const skugrIds = jobParams.skugrIds;
      if (Array.isArray(skugrIds) && skugrIds.length > 0) {
        const idSet = new Set<string>();
        for (const id of skugrIds) {
          const g = skugrs.find((x) => x.id === id);
          for (const skuId of g?.skuIds ?? []) idSet.add(skuId);
        }
        skus = skus.filter((s) => idSet.has(s.id));
      }
      if (dateFrom && dateTo) points = await collectPointsForSkus(slices, skus, dateFrom, dateTo);
      break;
    }
    case 'sku-selection-stock':
    case 'sku-selection-sales': {
      if (jobParams.selectAll === true) {
        if (typeof jobParams.konkName === 'string') {
          skus = skus.filter((s) => s.konkName === jobParams.konkName);
        }
        if (typeof jobParams.prodName === 'string') {
          skus = skus.filter((s) => s.prodName === jobParams.prodName);
        }
        if (typeof jobParams.search === 'string' && jobParams.search.trim()) {
          const q = jobParams.search.trim().toLowerCase();
          skus = skus.filter(
            (s) =>
              s.title.toLowerCase().includes(q) ||
              s.artikul.toLowerCase().includes(q) ||
              s.productId.toLowerCase().includes(q),
          );
        }
      } else if (Array.isArray(jobParams.skuIds)) {
        const idSet = new Set(jobParams.skuIds.map(String));
        skus = skus.filter((s) => idSet.has(s.id));
      } else {
        skus = [];
      }
      if (dateFrom && dateTo) points = await collectPointsForSkus(slices, skus, dateFrom, dateTo);
      break;
    }
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown excel kind: ${_exhaustive}`);
    }
  }

  return { konks, prods, skus, skugrs, points };
}

export function pointMapFromSnapshot(snapshot: ExcelSnapshot): Map<string, SlicePoint> {
  const map = new Map<string, SlicePoint>();
  for (const p of snapshot.points) {
    map.set(`${p.konkName}\0${p.productId}\0${p.date}`, {
      stock: p.stock,
      price: p.price,
    });
  }
  return map;
}
