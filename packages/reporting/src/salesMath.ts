import { isValidSliceMetricValue, toSliceDate } from '@balloons/domain';

export type DaySalesResult = {
  sales: number;
  isDeliveryDay: boolean;
};

export function toUtcDateKey(date: Date): string {
  return toSliceDate(date).toISOString().slice(0, 10);
}

export function applyRecountDayToSales(
  sales: number,
  date: Date,
  recountDays: ReadonlySet<string>,
): number {
  if (recountDays.has(toUtcDateKey(date))) return 0;
  return sales;
}

/**
 * Per-day sales from a stock sequence:
 * - missing prev/curr → 0
 * - stock increase → delivery day, sales 0
 * - otherwise prev - curr
 */
export function computeSalesFromStockSequence(stockByDay: (number | null)[]): DaySalesResult[] {
  const result: DaySalesResult[] = [];

  for (let i = 0; i < stockByDay.length; i++) {
    const curr = stockByDay[i];
    const currVal = typeof curr === 'number' && Number.isFinite(curr) ? curr : null;
    const prev = i > 0 ? stockByDay[i - 1] : null;
    const prevVal = typeof prev === 'number' && Number.isFinite(prev) ? prev : null;

    if (prevVal === null || currVal === null) {
      result.push({ sales: 0, isDeliveryDay: false });
      continue;
    }

    if (currVal > prevVal) {
      result.push({ sales: 0, isDeliveryDay: true });
      continue;
    }

    result.push({ sales: prevVal - currVal, isDeliveryDay: false });
  }

  return result;
}

export function computeRevenueForDay(sales: number, price: number | null): number {
  const p = typeof price === 'number' && Number.isFinite(price) ? price : 0;
  return Math.round(sales * p * 100) / 100;
}

export type PersistedDaySales = {
  salesPcs: number;
  salesUah: number;
  isDeliveryDay: boolean;
};

export function toMetricForPersistedSales(raw: unknown): number | null {
  return isValidSliceMetricValue(raw) ? raw : null;
}

export function isRedFlagSliceStock(raw: unknown): boolean {
  return raw === -1;
}

/**
 * Write-path day sales: -1 → 0, delivery → 0, else delta; apply recountDays.
 */
export function computePersistedDaySales(params: {
  prevStockRaw: unknown;
  currStockRaw: unknown;
  currPriceRaw: unknown;
  date: Date;
  recountDays?: ReadonlySet<string>;
}): PersistedDaySales {
  const { prevStockRaw, currStockRaw, currPriceRaw, date, recountDays } = params;

  if (isRedFlagSliceStock(currStockRaw)) {
    return { salesPcs: 0, salesUah: 0, isDeliveryDay: false };
  }

  const prev = toMetricForPersistedSales(prevStockRaw);
  const curr = toMetricForPersistedSales(currStockRaw);
  const seq = computeSalesFromStockSequence([prev, curr]);
  const day = seq[1]!;
  let sales = day.sales;

  if (recountDays) {
    sales = applyRecountDayToSales(sales, date, recountDays);
  }

  const price = toMetricForPersistedSales(currPriceRaw);
  return {
    salesPcs: sales,
    salesUah: computeRevenueForDay(sales, price),
    isDeliveryDay: day.isDeliveryDay,
  };
}

export function computeSharePercent(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}
