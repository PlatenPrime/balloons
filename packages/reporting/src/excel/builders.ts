import ExcelJS from 'exceljs';
import { computePersistedDaySales, computeSharePercent } from '../salesMath.js';
import { enumerateSliceDates, sliceDateMinusDays } from '../sliceDateShift.js';
import type { ExcelSkuKind } from './kinds.js';
import { pointMapFromSnapshot, type ExcelSnapshot } from './snapshot.js';

export type ExcelBuildResult = {
  filename: string;
  buffer: Buffer;
};

function parseYmd(s: unknown): Date | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T00:00:00.000Z`);
}

function parseMetrics(raw: unknown, allowed: string[]): string[] {
  if (raw == null) return [...allowed];
  const parts = Array.isArray(raw)
    ? raw.map(String)
    : String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const set = new Set(parts.filter((p) => allowed.includes(p)));
  return allowed.filter((a) => set.has(a));
}

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function recountDaysForKonk(snapshot: ExcelSnapshot, konkName: string): Set<string> {
  const konk = snapshot.konks.find((k) => k.name === konkName);
  return new Set((konk?.recountDays ?? []).map(String));
}

function getPoint(
  map: Map<string, { stock: number; price: number }>,
  konkName: string,
  productId: string,
  date: Date,
): { stock: number; price: number } | undefined {
  return map.get(`${konkName}\0${productId}\0${date.toISOString().slice(0, 10)}`);
}

function addCatalogSheet(wb: ExcelJS.Workbook, title: string, snapshot: ExcelSnapshot): void {
  const sheet = wb.addWorksheet(title);
  sheet.addRow(['id', 'konkName', 'prodName', 'productId', 'artikul', 'title', 'isInvalid']);
  for (const sku of snapshot.skus) {
    sheet.addRow([
      sku.id,
      sku.konkName,
      sku.prodName,
      sku.productId,
      sku.artikul,
      sku.title,
      sku.isInvalid ? 1 : 0,
    ]);
  }
}

function addStockBlock(
  sheet: ExcelJS.Worksheet,
  params: {
    snapshot: ExcelSnapshot;
    skuIds: string[];
    dateFrom: Date;
    dateTo: Date;
    metrics: string[];
  },
): void {
  const map = pointMapFromSnapshot(params.snapshot);
  const dates = enumerateSliceDates(params.dateFrom, params.dateTo);
  const skus = params.snapshot.skus.filter((s) => params.skuIds.includes(s.id));

  sheet.addRow(['SKU', 'Field', ...dates.map((d) => d.toISOString().slice(0, 10))]);

  for (const sku of skus) {
    if (params.metrics.includes('stock')) {
      const row: (string | number | null)[] = [sku.title, 'Залишок'];
      for (const d of dates) {
        const p = getPoint(map, sku.konkName, sku.productId, d);
        row.push(p && p.stock !== -1 ? p.stock : null);
      }
      sheet.addRow(row);
    }
    if (params.metrics.includes('price')) {
      const row: (string | number | null)[] = [sku.title, 'Ціна'];
      for (const d of dates) {
        const p = getPoint(map, sku.konkName, sku.productId, d);
        row.push(p && p.price !== -1 ? p.price : null);
      }
      sheet.addRow(row);
    }
  }
}

function addSalesBlock(
  sheet: ExcelJS.Worksheet,
  params: {
    snapshot: ExcelSnapshot;
    skuIds: string[];
    dateFrom: Date;
    dateTo: Date;
    metrics: string[];
  },
): void {
  const map = pointMapFromSnapshot(params.snapshot);
  const dates = enumerateSliceDates(params.dateFrom, params.dateTo);
  const skus = params.snapshot.skus.filter((s) => params.skuIds.includes(s.id));

  sheet.addRow(['SKU', 'Field', ...dates.map((d) => d.toISOString().slice(0, 10))]);

  for (const sku of skus) {
    const recount = recountDaysForKonk(params.snapshot, sku.konkName);
    const salesRow: (string | number | null)[] = [sku.title, 'Продажі'];
    const priceRow: (string | number | null)[] = [sku.title, 'Ціна'];
    const revRow: (string | number | null)[] = [sku.title, 'Виручка'];

    let prev = getPoint(map, sku.konkName, sku.productId, sliceDateMinusDays(dates[0]!, 1));

    for (const d of dates) {
      const curr = getPoint(map, sku.konkName, sku.productId, d);
      const persisted = computePersistedDaySales({
        prevStockRaw: prev?.stock,
        currStockRaw: curr?.stock,
        currPriceRaw: curr?.price,
        date: d,
        recountDays: recount,
      });
      salesRow.push(persisted.salesPcs);
      priceRow.push(curr && curr.price !== -1 ? curr.price : null);
      revRow.push(persisted.salesUah);
      if (curr) prev = curr;
    }

    if (params.metrics.includes('sales')) sheet.addRow(salesRow);
    if (params.metrics.includes('price')) sheet.addRow(priceRow);
    if (params.metrics.includes('revenue')) sheet.addRow(revRow);
  }
}

function addShareSheet(
  wb: ExcelJS.Workbook,
  snapshot: ExcelSnapshot,
  dateFrom: Date,
  dateTo: Date,
  sortBy: 'sales' | 'revenue',
): void {
  const map = pointMapFromSnapshot(snapshot);
  const dates = enumerateSliceDates(dateFrom, dateTo);
  const rows: Array<{ title: string; salesPcs: number; salesUah: number }> = [];

  for (const sku of snapshot.skus) {
    const recount = recountDaysForKonk(snapshot, sku.konkName);
    let salesPcs = 0;
    let salesUah = 0;
    let prev = getPoint(map, sku.konkName, sku.productId, sliceDateMinusDays(dates[0]!, 1));
    for (const d of dates) {
      const curr = getPoint(map, sku.konkName, sku.productId, d);
      const persisted = computePersistedDaySales({
        prevStockRaw: prev?.stock,
        currStockRaw: curr?.stock,
        currPriceRaw: curr?.price,
        date: d,
        recountDays: recount,
      });
      salesPcs += persisted.salesPcs;
      salesUah += persisted.salesUah;
      if (curr) prev = curr;
    }
    rows.push({
      title: sku.title,
      salesPcs,
      salesUah: Math.round(salesUah * 100) / 100,
    });
  }

  rows.sort((a, b) => (sortBy === 'revenue' ? b.salesUah - a.salesUah : b.salesPcs - a.salesPcs));

  const totalPcs = rows.reduce((s, r) => s + r.salesPcs, 0);
  const totalUah = rows.reduce((s, r) => s + r.salesUah, 0);
  const sheet = wb.addWorksheet('Share');
  sheet.addRow(['SKU', 'salesPcs', 'sharePcs%', 'salesUah', 'shareUah%']);
  for (const r of rows) {
    sheet.addRow([
      r.title,
      r.salesPcs,
      computeSharePercent(r.salesPcs, totalPcs),
      r.salesUah,
      computeSharePercent(r.salesUah, totalUah),
    ]);
  }
}

/**
 * Build XLSX buffer from a serializable snapshot (main or worker).
 */
export async function buildExcelFromSnapshot(
  kind: ExcelSkuKind,
  params: Record<string, unknown>,
  snapshot: ExcelSnapshot,
): Promise<ExcelBuildResult> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'balloons';
  const dateFrom = parseYmd(params.dateFrom);
  const dateTo = parseYmd(params.dateTo);

  switch (kind) {
    case 'sku-catalog-new-since': {
      addCatalogSheet(wb, 'New since', snapshot);
      return {
        filename: `sku-catalog-new-since-${String(params.since ?? 'all')}.xlsx`,
        buffer: await workbookToBuffer(wb),
      };
    }
    case 'sku-catalog-invalid': {
      addCatalogSheet(wb, 'Invalid', snapshot);
      return {
        filename: `sku-catalog-invalid-${String(params.konk ?? 'all')}.xlsx`,
        buffer: await workbookToBuffer(wb),
      };
    }
    case 'sku-one-stock':
    case 'sku-skugr-stock':
    case 'sku-konk-stock':
    case 'sku-selection-stock': {
      if (!dateFrom || !dateTo) throw new Error('dateFrom/dateTo required');
      const sheet = wb.addWorksheet('Stock');
      addStockBlock(sheet, {
        snapshot,
        skuIds: snapshot.skus.map((s) => s.id),
        dateFrom,
        dateTo,
        metrics: parseMetrics(params.metrics, ['stock', 'price']),
      });
      return { filename: `${kind}.xlsx`, buffer: await workbookToBuffer(wb) };
    }
    case 'sku-one-sales':
    case 'sku-skugr-sales':
    case 'sku-konk-sales':
    case 'sku-selection-sales': {
      if (!dateFrom || !dateTo) throw new Error('dateFrom/dateTo required');
      const sheet = wb.addWorksheet('Sales');
      addSalesBlock(sheet, {
        snapshot,
        skuIds: snapshot.skus.map((s) => s.id),
        dateFrom,
        dateTo,
        metrics: parseMetrics(params.metrics, ['sales', 'price', 'revenue']),
      });
      if (kind === 'sku-selection-sales') {
        addShareSheet(wb, snapshot, dateFrom, dateTo, 'sales');
      }
      return { filename: `${kind}.xlsx`, buffer: await workbookToBuffer(wb) };
    }
    case 'sku-skugr-skus-share': {
      if (!dateFrom || !dateTo) throw new Error('dateFrom/dateTo required');
      const sortBy = params.sortBy === 'revenue' ? 'revenue' : 'sales';
      addShareSheet(wb, snapshot, dateFrom, dateTo, sortBy);
      return { filename: `${kind}.xlsx`, buffer: await workbookToBuffer(wb) };
    }
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown excel kind: ${_exhaustive}`);
    }
  }
}
