import { describe, expect, it } from 'vitest';
import {
  defaultParamsForKind,
  excelDownloadFilename,
  parseExcelParamsJson,
  withDefaultSkuId,
} from './excelParams.js';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO, DEFAULT_KONK } from './urlSearch.js';

describe('defaultParamsForKind', () => {
  it('returns catalog defaults', () => {
    expect(defaultParamsForKind('sku-catalog-new-since')).toEqual({ since: DEFAULT_DATE_FROM });
    expect(defaultParamsForKind('sku-catalog-invalid')).toEqual({ konk: DEFAULT_KONK });
  });

  it('returns date-bounded one-sku and selection defaults', () => {
    expect(defaultParamsForKind('sku-one-sales')).toEqual({
      skuId: '',
      dateFrom: DEFAULT_DATE_FROM,
      dateTo: DEFAULT_DATE_TO,
    });
    expect(defaultParamsForKind('sku-selection-sales')).toMatchObject({
      selectAll: true,
      konkName: DEFAULT_KONK,
    });
  });
});

describe('parseExcelParamsJson', () => {
  it('parses object JSON', () => {
    expect(parseExcelParamsJson('{"skuId":"s1"}')).toEqual({ skuId: 's1' });
  });

  it('rejects non-object JSON', () => {
    expect(() => parseExcelParamsJson('[]')).toThrow(/JSON object/);
    expect(() => parseExcelParamsJson('"x"')).toThrow(/JSON object/);
    expect(() => parseExcelParamsJson('{')).toThrow();
  });
});

describe('withDefaultSkuId', () => {
  it('fills empty skuId only for one-sku kinds', () => {
    expect(withDefaultSkuId('sku-one-sales', { skuId: '' }, 'sku-1')).toEqual({
      skuId: 'sku-1',
    });
    expect(withDefaultSkuId('sku-one-sales', { skuId: 'keep' }, 'sku-1')).toEqual({
      skuId: 'keep',
    });
    expect(withDefaultSkuId('sku-konk-sales', { skuId: '' }, 'sku-1')).toEqual({ skuId: '' });
  });
});

describe('excelDownloadFilename', () => {
  it('prefers job filename then kind.xlsx', () => {
    expect(excelDownloadFilename({ kind: 'sku-one-sales', filename: 'a.xlsx' })).toBe('a.xlsx');
    expect(excelDownloadFilename({ kind: 'sku-one-sales' })).toBe('sku-one-sales.xlsx');
  });
});
