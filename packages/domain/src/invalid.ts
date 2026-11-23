import type { SlicePoint } from './types.js';

/**
 * Value is usable in slice series: finite number and not sentinel -1.
 */
export function isValidSliceMetricValue(v: unknown): v is number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  if (v === -1) return false;
  return true;
}

/**
 * Full negative outcome: both stock and price are -1.
 */
export function isFullMinusOneStockPrice(stock: unknown, price: unknown): boolean {
  return stock === -1 && price === -1;
}

export function isFullMinusOneSlicePoint(item: SlicePoint | null | undefined): boolean {
  if (item == null) return false;
  return isFullMinusOneStockPrice(item.stock, item.price);
}

/**
 * Invalid slice outcome: missing data or sentinel -1 in stock/price.
 */
export function isInvalidSlicePoint(item: SlicePoint | null | undefined): boolean {
  if (item == null) return true;
  return item.stock === -1 || item.price === -1;
}
