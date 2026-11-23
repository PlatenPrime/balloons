import { describe, expect, it } from 'vitest';
import {
  isFullMinusOneSlicePoint,
  isFullMinusOneStockPrice,
  isInvalidSlicePoint,
  isValidSliceMetricValue,
} from './invalid.js';

describe('isValidSliceMetricValue', () => {
  it('rejects non-finite and sentinel -1', () => {
    expect(isValidSliceMetricValue(0)).toBe(true);
    expect(isValidSliceMetricValue(12.5)).toBe(true);
    expect(isValidSliceMetricValue(-1)).toBe(false);
    expect(isValidSliceMetricValue(Number.NaN)).toBe(false);
    expect(isValidSliceMetricValue('1')).toBe(false);
  });
});

describe('isInvalidSlicePoint', () => {
  it('treats null and any -1 as invalid', () => {
    expect(isInvalidSlicePoint(null)).toBe(true);
    expect(isInvalidSlicePoint(undefined)).toBe(true);
    expect(isInvalidSlicePoint({ stock: -1, price: 10 })).toBe(true);
    expect(isInvalidSlicePoint({ stock: 10, price: -1 })).toBe(true);
    expect(isInvalidSlicePoint({ stock: 10, price: 10 })).toBe(false);
  });
});

describe('full minus-one', () => {
  it('detects stock=-1 and price=-1', () => {
    expect(isFullMinusOneStockPrice(-1, -1)).toBe(true);
    expect(isFullMinusOneStockPrice(-1, 0)).toBe(false);
    expect(isFullMinusOneSlicePoint({ stock: -1, price: -1 })).toBe(true);
  });
});
