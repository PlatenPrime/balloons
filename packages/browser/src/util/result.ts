import type { SkuPageData, SkugrPageProduct } from '../types.js';

export type SkuExtras = {
  productId?: string | undefined;
  artikul?: string | undefined;
  title?: string | undefined;
  packSize?: number | undefined;
};

export type SkugrExtras = {
  url?: string | undefined;
  title?: string | undefined;
};

export function skuResult(stock: number, price: number, extras: SkuExtras = {}): SkuPageData {
  const out: SkuPageData = { stock, price };
  if (extras.productId !== undefined) {
    out.productId = extras.productId;
  }
  if (extras.artikul !== undefined) {
    out.artikul = extras.artikul;
  }
  if (extras.title !== undefined) {
    out.title = extras.title;
  }
  if (extras.packSize !== undefined) {
    out.packSize = extras.packSize;
  }
  return out;
}

export function skugrProduct(productId: string, extras: SkugrExtras = {}): SkugrPageProduct {
  const out: SkugrPageProduct = { productId };
  if (extras.url !== undefined) {
    out.url = extras.url;
  }
  if (extras.title !== undefined) {
    out.title = extras.title;
  }
  return out;
}
