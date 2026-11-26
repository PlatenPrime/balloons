import { describe, expect, it } from 'vitest';
import { filterInvalidDayPoints, isInvalidSlicePoint } from './invalidPoints.js';

describe('invalidPoints', () => {
  it('treats missing and -1 metrics as invalid', () => {
    expect(isInvalidSlicePoint(null)).toBe(true);
    expect(isInvalidSlicePoint(undefined)).toBe(true);
    expect(isInvalidSlicePoint({ stock: -1, price: 10 })).toBe(true);
    expect(isInvalidSlicePoint({ stock: 5, price: -1 })).toBe(true);
    expect(isInvalidSlicePoint({ stock: 5, price: 10 })).toBe(false);
  });

  it('filters day point rows', () => {
    const items = [
      { productId: 'a', point: { stock: 1, price: 2 } },
      { productId: 'b', point: { stock: -1, price: 2 } },
    ];
    expect(filterInvalidDayPoints(items).map((i) => i.productId)).toEqual(['b']);
  });
});
