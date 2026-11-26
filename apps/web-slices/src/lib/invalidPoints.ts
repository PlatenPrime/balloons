/** Same semantics as `@balloons/domain` `isInvalidSlicePoint` (stock/price sentinel -1). */
export function isInvalidSlicePoint(
  point:
    | {
        stock: number;
        price: number;
      }
    | null
    | undefined,
): boolean {
  if (point == null) return true;
  return point.stock === -1 || point.price === -1;
}

export function filterInvalidDayPoints<T extends { point: { stock: number; price: number } }>(
  items: T[],
): T[] {
  return items.filter((item) => isInvalidSlicePoint(item.point));
}
