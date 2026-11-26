import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SLICE_DAY,
  DEFAULT_SLICE_KONK,
  parseCatalogListSearch,
  parseSlicesSearch,
  patchCatalogListSearch,
  writeCatalogListSearch,
  writeSlicesSearch,
} from './urlSearch.js';

describe('urlSearch', () => {
  it('parses slices search with defaults', () => {
    expect(parseSlicesSearch(new URLSearchParams())).toEqual({
      konk: DEFAULT_SLICE_KONK,
      day: DEFAULT_SLICE_DAY,
    });
    expect(parseSlicesSearch(new URLSearchParams('konk=balun&day=2026-01-01'))).toEqual({
      konk: 'balun',
      day: '2026-01-01',
    });
  });

  it('round-trips slices search', () => {
    const params = writeSlicesSearch({ konk: 'air', day: '2026-07-15T00:00:00.000Z' });
    expect(parseSlicesSearch(params)).toEqual({
      konk: 'air',
      day: '2026-07-15T00:00:00.000Z',
    });
  });

  it('parses optional catalog filters', () => {
    expect(parseCatalogListSearch(new URLSearchParams())).toEqual({});
    expect(
      parseCatalogListSearch(new URLSearchParams('konkName=air&isInvalid=true&isSliced=false')),
    ).toEqual({
      konkName: 'air',
      isInvalid: true,
      isSliced: false,
    });
    const written = writeCatalogListSearch({
      konkName: 'air',
      isInvalid: true,
    });
    expect(written.get('konkName')).toBe('air');
    expect(written.get('isInvalid')).toBe('true');
    expect(written.get('isSliced')).toBeNull();
  });

  it('patches catalog filters with null clears', () => {
    expect(
      patchCatalogListSearch({ konkName: 'air', isInvalid: true }, { isInvalid: null }),
    ).toEqual({ konkName: 'air' });
    expect(patchCatalogListSearch({ konkName: 'air' }, { konkName: null })).toEqual({});
    expect(patchCatalogListSearch({}, { isSliced: true })).toEqual({ isSliced: true });
  });
});
