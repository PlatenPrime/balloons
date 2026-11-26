export const DEFAULT_SLICE_KONK = 'air';
export const DEFAULT_SLICE_DAY = '2026-07-15T00:00:00.000Z';

export function readSearchParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  if (value === null || value === '') return undefined;
  return value;
}

export function readBoolSearchParam(params: URLSearchParams, key: string): boolean | undefined {
  const raw = readSearchParam(params, key);
  if (raw === undefined) return undefined;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return undefined;
}

export type SlicesSearch = {
  konk: string;
  day: string;
};

export function parseSlicesSearch(params: URLSearchParams): SlicesSearch {
  return {
    konk: readSearchParam(params, 'konk') ?? DEFAULT_SLICE_KONK,
    day: readSearchParam(params, 'day') ?? DEFAULT_SLICE_DAY,
  };
}

export function writeSlicesSearch(next: SlicesSearch): URLSearchParams {
  const params = new URLSearchParams();
  params.set('konk', next.konk);
  params.set('day', next.day);
  return params;
}

export type CatalogListSearch = {
  konkName?: string;
  isInvalid?: boolean;
  isSliced?: boolean;
};

export function parseCatalogListSearch(params: URLSearchParams): CatalogListSearch {
  const out: CatalogListSearch = {};
  const konkName = readSearchParam(params, 'konkName');
  if (konkName !== undefined) out.konkName = konkName;
  const isInvalid = readBoolSearchParam(params, 'isInvalid');
  if (isInvalid !== undefined) out.isInvalid = isInvalid;
  const isSliced = readBoolSearchParam(params, 'isSliced');
  if (isSliced !== undefined) out.isSliced = isSliced;
  return out;
}

export function writeCatalogListSearch(next: CatalogListSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (next.konkName) params.set('konkName', next.konkName);
  if (next.isInvalid !== undefined) params.set('isInvalid', String(next.isInvalid));
  if (next.isSliced !== undefined) params.set('isSliced', String(next.isSliced));
  return params;
}

/** Patch catalog list filters without writing explicit `undefined` keys (EOPT-safe). */
export function patchCatalogListSearch(
  current: CatalogListSearch,
  patch: {
    konkName?: string | null;
    isInvalid?: boolean | null;
    isSliced?: boolean | null;
  },
): CatalogListSearch {
  const next: CatalogListSearch = {};
  const konkName = patch.konkName === null ? undefined : (patch.konkName ?? current.konkName);
  const isInvalid = patch.isInvalid === null ? undefined : (patch.isInvalid ?? current.isInvalid);
  const isSliced = patch.isSliced === null ? undefined : (patch.isSliced ?? current.isSliced);
  if (konkName !== undefined) next.konkName = konkName;
  if (isInvalid !== undefined) next.isInvalid = isInvalid;
  if (isSliced !== undefined) next.isSliced = isSliced;
  return next;
}
