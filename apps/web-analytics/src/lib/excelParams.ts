import { excelSkuKindSchema } from '@balloons/web-api-client';
import { z } from 'zod';
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO, DEFAULT_KONK, DEFAULT_PROD } from './urlSearch.js';

export type ExcelKind = z.infer<typeof excelSkuKindSchema>;

export const EXCEL_KINDS = excelSkuKindSchema.options;

export function defaultParamsForKind(kind: ExcelKind): Record<string, unknown> {
  switch (kind) {
    case 'sku-catalog-new-since':
      return { since: DEFAULT_DATE_FROM };
    case 'sku-catalog-invalid':
      return { konk: DEFAULT_KONK };
    case 'sku-one-stock':
    case 'sku-one-sales':
      return { skuId: '', dateFrom: DEFAULT_DATE_FROM, dateTo: DEFAULT_DATE_TO };
    case 'sku-skugr-stock':
    case 'sku-skugr-sales':
    case 'sku-skugr-skus-share':
      return { skugrId: '', dateFrom: DEFAULT_DATE_FROM, dateTo: DEFAULT_DATE_TO };
    case 'sku-konk-stock':
    case 'sku-konk-sales':
      return {
        konk: DEFAULT_KONK,
        prod: DEFAULT_PROD,
        dateFrom: DEFAULT_DATE_FROM,
        dateTo: DEFAULT_DATE_TO,
      };
    case 'sku-selection-stock':
    case 'sku-selection-sales':
      return {
        selectAll: true,
        dateFrom: DEFAULT_DATE_FROM,
        dateTo: DEFAULT_DATE_TO,
        konkName: DEFAULT_KONK,
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function parseExcelParamsJson(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Params must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/** Fill empty skuId for one-sku kinds from catalog default. */
export function withDefaultSkuId(
  kind: ExcelKind,
  params: Record<string, unknown>,
  defaultSkuId: string | undefined,
): Record<string, unknown> {
  if (kind !== 'sku-one-sales' && kind !== 'sku-one-stock') return params;
  if (params.skuId || !defaultSkuId) return params;
  return { ...params, skuId: defaultSkuId };
}

export function excelDownloadFilename(job: {
  kind: string;
  filename?: string | undefined;
}): string {
  return job.filename ?? `${job.kind}.xlsx`;
}
