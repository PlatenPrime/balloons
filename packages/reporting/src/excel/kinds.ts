export const EXCEL_SKU_KINDS = [
  'sku-catalog-new-since',
  'sku-catalog-invalid',
  'sku-one-stock',
  'sku-one-sales',
  'sku-skugr-stock',
  'sku-skugr-sales',
  'sku-skugr-skus-share',
  'sku-konk-stock',
  'sku-konk-sales',
  'sku-selection-stock',
  'sku-selection-sales',
] as const;

export type ExcelSkuKind = (typeof EXCEL_SKU_KINDS)[number];

export function isExcelSkuKind(v: string): v is ExcelSkuKind {
  return (EXCEL_SKU_KINDS as readonly string[]).includes(v);
}

export type ExcelJobParams = Record<string, unknown>;

export type ExcelBuildRequest = {
  kind: ExcelSkuKind;
  params: ExcelJobParams;
};
