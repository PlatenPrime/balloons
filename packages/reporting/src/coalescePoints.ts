import { isValidSliceMetricValue, type SlicePoint } from '@balloons/domain';

export type ReportingCoalescedPoint = {
  stock: number | null;
  price: number | null;
};

export type ReportingCarry = {
  lastStock: number | null;
  lastPrice: number | null;
};

/**
 * Forward-fill for reports: -1 and gaps do not update carry;
 * each day emits last valid stock/price from the left.
 */
export function coalesceSlicePointsAlongDates(
  dates: Date[],
  getPoint: (d: Date) => SlicePoint | null | undefined,
  initial: ReportingCarry = { lastStock: null, lastPrice: null },
): ReportingCoalescedPoint[] {
  let lastStock = initial.lastStock;
  let lastPrice = initial.lastPrice;
  const out: ReportingCoalescedPoint[] = [];

  for (const d of dates) {
    const item = getPoint(d);
    if (isValidSliceMetricValue(item?.stock)) lastStock = item.stock;
    if (isValidSliceMetricValue(item?.price)) lastPrice = item.price;
    out.push({ stock: lastStock, price: lastPrice });
  }

  return out;
}
