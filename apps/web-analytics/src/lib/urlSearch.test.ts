import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DATE_FROM,
  DEFAULT_DATE_TO,
  DEFAULT_KONK,
  DEFAULT_PROD,
  parseKonkDateRangeSearch,
  parseProdDateRangeSearch,
  parseReportRangeSearch,
  parseSelectionPieSearch,
  parseSkugrDrillSearch,
  patchReportRangeSearch,
  writeReportRangeSearch,
  writeSelectionPieSearch,
} from './urlSearch.js';

describe('report URL search helpers', () => {
  it('parses report range with defaults', () => {
    expect(parseReportRangeSearch(new URLSearchParams())).toEqual({
      konk: DEFAULT_KONK,
      prod: DEFAULT_PROD,
      dateFrom: DEFAULT_DATE_FROM,
      dateTo: DEFAULT_DATE_TO,
    });
  });

  it('round-trips report range including skugrIds', () => {
    const written = writeReportRangeSearch({
      konk: 'air',
      prod: 'sample-prod',
      dateFrom: '2026-07-14',
      dateTo: '2026-07-16',
      skugrIds: 'skugr-1',
    });
    expect(parseReportRangeSearch(written)).toEqual({
      konk: 'air',
      prod: 'sample-prod',
      dateFrom: '2026-07-14',
      dateTo: '2026-07-16',
      skugrIds: 'skugr-1',
    });
  });

  it('patches without writing undefined skugrIds', () => {
    const next = patchReportRangeSearch(
      {
        konk: 'air',
        prod: 'sample-prod',
        dateFrom: '2026-07-14',
        dateTo: '2026-07-16',
        skugrIds: 'x',
      },
      { skugrIds: null },
    );
    expect(next.skugrIds).toBeUndefined();
    expect(writeReportRangeSearch(next).has('skugrIds')).toBe(false);
  });

  it('parses konk / prod / skugr / selection searches', () => {
    expect(parseKonkDateRangeSearch(new URLSearchParams('konk=balun'))).toMatchObject({
      konk: 'balun',
      dateFrom: DEFAULT_DATE_FROM,
    });
    expect(
      parseProdDateRangeSearch(new URLSearchParams('prod=latex&excludeKonks=air')),
    ).toMatchObject({
      prod: 'latex',
      excludeKonks: 'air',
    });
    expect(parseSkugrDrillSearch(new URLSearchParams('skugrId=g1'))).toMatchObject({
      skugrId: 'g1',
    });
    const selection = parseSelectionPieSearch(new URLSearchParams('selectAll=true&konkName=air'));
    expect(selection.selectAll).toBe(true);
    expect(selection.konkName).toBe('air');
    expect(writeSelectionPieSearch(selection).get('selectAll')).toBe('true');
  });
});
