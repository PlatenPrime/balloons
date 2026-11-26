export const DEFAULT_KONK = 'air';
export const DEFAULT_PROD = 'sample-prod';
export const DEFAULT_DATE_FROM = '2026-07-14';
export const DEFAULT_DATE_TO = '2026-07-16';

export function readSearchParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  if (value === null || value === '') return undefined;
  return value;
}

export type ReportRangeSearch = {
  konk: string;
  prod: string;
  dateFrom: string;
  dateTo: string;
  skugrIds?: string;
};

export function parseReportRangeSearch(params: URLSearchParams): ReportRangeSearch {
  const out: ReportRangeSearch = {
    konk: readSearchParam(params, 'konk') ?? DEFAULT_KONK,
    prod: readSearchParam(params, 'prod') ?? DEFAULT_PROD,
    dateFrom: readSearchParam(params, 'dateFrom') ?? DEFAULT_DATE_FROM,
    dateTo: readSearchParam(params, 'dateTo') ?? DEFAULT_DATE_TO,
  };
  const skugrIds = readSearchParam(params, 'skugrIds');
  if (skugrIds !== undefined) out.skugrIds = skugrIds;
  return out;
}

export function writeReportRangeSearch(next: ReportRangeSearch): URLSearchParams {
  const params = new URLSearchParams();
  params.set('konk', next.konk);
  params.set('prod', next.prod);
  params.set('dateFrom', next.dateFrom);
  params.set('dateTo', next.dateTo);
  if (next.skugrIds) params.set('skugrIds', next.skugrIds);
  return params;
}

export function patchReportRangeSearch(
  current: ReportRangeSearch,
  patch: {
    konk?: string | null;
    prod?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    skugrIds?: string | null;
  },
): ReportRangeSearch {
  const next: ReportRangeSearch = {
    konk: patch.konk === null ? DEFAULT_KONK : (patch.konk ?? current.konk),
    prod: patch.prod === null ? DEFAULT_PROD : (patch.prod ?? current.prod),
    dateFrom: patch.dateFrom === null ? DEFAULT_DATE_FROM : (patch.dateFrom ?? current.dateFrom),
    dateTo: patch.dateTo === null ? DEFAULT_DATE_TO : (patch.dateTo ?? current.dateTo),
  };
  const skugrIds = patch.skugrIds === null ? undefined : (patch.skugrIds ?? current.skugrIds);
  if (skugrIds !== undefined) next.skugrIds = skugrIds;
  return next;
}

export type KonkDateRangeSearch = {
  konk: string;
  dateFrom: string;
  dateTo: string;
};

export function parseKonkDateRangeSearch(params: URLSearchParams): KonkDateRangeSearch {
  return {
    konk: readSearchParam(params, 'konk') ?? DEFAULT_KONK,
    dateFrom: readSearchParam(params, 'dateFrom') ?? DEFAULT_DATE_FROM,
    dateTo: readSearchParam(params, 'dateTo') ?? DEFAULT_DATE_TO,
  };
}

export function writeKonkDateRangeSearch(next: KonkDateRangeSearch): URLSearchParams {
  const params = new URLSearchParams();
  params.set('konk', next.konk);
  params.set('dateFrom', next.dateFrom);
  params.set('dateTo', next.dateTo);
  return params;
}

export type ProdDateRangeSearch = {
  prod: string;
  dateFrom: string;
  dateTo: string;
  excludeKonks?: string;
};

export function parseProdDateRangeSearch(params: URLSearchParams): ProdDateRangeSearch {
  const out: ProdDateRangeSearch = {
    prod: readSearchParam(params, 'prod') ?? DEFAULT_PROD,
    dateFrom: readSearchParam(params, 'dateFrom') ?? DEFAULT_DATE_FROM,
    dateTo: readSearchParam(params, 'dateTo') ?? DEFAULT_DATE_TO,
  };
  const excludeKonks = readSearchParam(params, 'excludeKonks');
  if (excludeKonks !== undefined) out.excludeKonks = excludeKonks;
  return out;
}

export function writeProdDateRangeSearch(next: ProdDateRangeSearch): URLSearchParams {
  const params = new URLSearchParams();
  params.set('prod', next.prod);
  params.set('dateFrom', next.dateFrom);
  params.set('dateTo', next.dateTo);
  if (next.excludeKonks) params.set('excludeKonks', next.excludeKonks);
  return params;
}

export type SkugrDrillSearch = {
  skugrId: string;
  dateFrom: string;
  dateTo: string;
};

export function parseSkugrDrillSearch(params: URLSearchParams): SkugrDrillSearch {
  return {
    skugrId: readSearchParam(params, 'skugrId') ?? '',
    dateFrom: readSearchParam(params, 'dateFrom') ?? DEFAULT_DATE_FROM,
    dateTo: readSearchParam(params, 'dateTo') ?? DEFAULT_DATE_TO,
  };
}

export function writeSkugrDrillSearch(next: SkugrDrillSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (next.skugrId) params.set('skugrId', next.skugrId);
  params.set('dateFrom', next.dateFrom);
  params.set('dateTo', next.dateTo);
  return params;
}

export type SelectionPieSearch = {
  dateFrom: string;
  dateTo: string;
  selectAll: boolean;
  skuIds?: string;
  search?: string;
  konkName?: string;
  prodName?: string;
};

export function parseSelectionPieSearch(params: URLSearchParams): SelectionPieSearch {
  const out: SelectionPieSearch = {
    dateFrom: readSearchParam(params, 'dateFrom') ?? DEFAULT_DATE_FROM,
    dateTo: readSearchParam(params, 'dateTo') ?? DEFAULT_DATE_TO,
    selectAll: readSearchParam(params, 'selectAll') === 'true',
  };
  const skuIds = readSearchParam(params, 'skuIds');
  if (skuIds !== undefined) out.skuIds = skuIds;
  const search = readSearchParam(params, 'search');
  if (search !== undefined) out.search = search;
  const konkName = readSearchParam(params, 'konkName');
  if (konkName !== undefined) out.konkName = konkName;
  const prodName = readSearchParam(params, 'prodName');
  if (prodName !== undefined) out.prodName = prodName;
  return out;
}

export function writeSelectionPieSearch(next: SelectionPieSearch): URLSearchParams {
  const params = new URLSearchParams();
  params.set('dateFrom', next.dateFrom);
  params.set('dateTo', next.dateTo);
  if (next.selectAll) params.set('selectAll', 'true');
  if (next.skuIds) params.set('skuIds', next.skuIds);
  if (next.search) params.set('search', next.search);
  if (next.konkName) params.set('konkName', next.konkName);
  if (next.prodName) params.set('prodName', next.prodName);
  return params;
}
