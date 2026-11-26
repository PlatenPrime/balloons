import type { SelectionPieSearch } from './urlSearch.js';

export type SalesPcsRow = { title: string; salesPcs: number; salesUah: number };

export type PieRow = { name: string; value: number; key: string };

export function mapNamedSalesPie(data: Record<string, SalesPcsRow> | undefined): PieRow[] {
  return Object.entries(data ?? {}).map(([key, row]) => ({
    key,
    name: row.title || key,
    value: row.salesPcs,
  }));
}

export type SelectionPieRow = SalesPcsRow & {
  sharePcs: number;
  shareUah: number;
};

export function mapSelectionPie(data: Record<string, SelectionPieRow> | undefined): Array<{
  skuId: string;
  title: string;
  salesPcs: number;
  salesUah: number;
  sharePcs: number;
  shareUah: number;
  pieName: string;
  pieValue: number;
}> {
  return Object.entries(data ?? {}).map(([skuId, row]) => ({
    skuId,
    title: row.title,
    salesPcs: row.salesPcs,
    salesUah: row.salesUah,
    sharePcs: row.sharePcs,
    shareUah: row.shareUah,
    pieName: row.title || skuId,
    pieValue: row.salesPcs,
  }));
}

export function canQuerySelectionPie(search: SelectionPieSearch): boolean {
  return search.selectAll || Boolean(search.skuIds);
}

export function buildSelectionPieQuery(
  search: SelectionPieSearch,
): Record<string, string | undefined> {
  const q: Record<string, string | undefined> = {
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  };
  if (search.selectAll) q.selectAll = 'true';
  if (search.skuIds) q.skuIds = search.skuIds;
  if (search.search) q.search = search.search;
  if (search.konkName) q.konkName = search.konkName;
  if (search.prodName) q.prodName = search.prodName;
  return q;
}
