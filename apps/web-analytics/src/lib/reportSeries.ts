export type SeriesPoint = {
  date: string;
  stock?: number;
  sales?: number;
  revenue?: number;
};

export type SalesSeriesResponse = {
  days?: Array<{ date?: unknown; sales?: unknown; revenue?: unknown; stock?: unknown }>;
  summary?: { salesPcs?: number; salesUah?: number };
};

export type StockSeriesResponse = {
  days?: Array<{ date?: unknown; stock?: unknown }>;
  summary?: { stockLast?: number };
};

export function readSalesSeries(data: unknown): {
  days: SeriesPoint[];
  summary: { salesPcs: number; salesUah: number } | null;
} {
  const body = data as SalesSeriesResponse | null | undefined;
  const days = (body?.days ?? []).map((d) => ({
    date: String(d.date ?? ''),
    sales: Number(d.sales ?? 0),
    revenue: Number(d.revenue ?? 0),
    stock: Number(d.stock ?? 0),
  }));
  if (!body?.summary) return { days, summary: null };
  return {
    days,
    summary: {
      salesPcs: body.summary.salesPcs ?? 0,
      salesUah: body.summary.salesUah ?? 0,
    },
  };
}

export function readStockSeries(data: unknown): {
  days: SeriesPoint[];
  summary: { stockLast: number } | null;
} {
  const body = data as StockSeriesResponse | null | undefined;
  const days = (body?.days ?? []).map((d) => ({
    date: String(d.date ?? ''),
    stock: Number(d.stock ?? 0),
  }));
  if (!body?.summary) return { days, summary: null };
  return {
    days,
    summary: { stockLast: body.summary.stockLast ?? 0 },
  };
}

export function buildSeriesQuery(input: {
  konk: string;
  prod: string;
  dateFrom: string;
  dateTo: string;
  skugrIds?: string;
}): {
  konk: string;
  prod: string;
  dateFrom: string;
  dateTo: string;
  skugrIds?: string;
} {
  const query: {
    konk: string;
    prod: string;
    dateFrom: string;
    dateTo: string;
    skugrIds?: string;
  } = {
    konk: input.konk,
    prod: input.prod,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
  if (input.skugrIds) query.skugrIds = input.skugrIds;
  return query;
}
