export type ParseContext = {
  konk: string;
  url?: string;
  productId?: string;
};

/** SKU card parse / fetch result (wh-aligned). */
export type SkuPageData = {
  productId?: string;
  artikul?: string;
  title?: string;
  stock: number;
  price: number;
  packSize?: number;
};

/** @deprecated Prefer SkuPageData — kept as alias for existing call sites. */
export type ParsedSkuPage = SkuPageData;

export type SkugrPageProduct = {
  productId: string;
  url?: string;
  title?: string;
};

export type SkugrPageData = {
  products: SkugrPageProduct[];
};

/** @deprecated Prefer SkugrPageData. */
export type ParsedSkugrPage = SkugrPageData;

/** @deprecated Prefer SkugrPageProduct. */
export type ParsedSkugrProduct = SkugrPageProduct;

export type SkuPageParser = (html: string, ctx: ParseContext) => SkuPageData;
export type SkugrPageParser = (html: string, ctx: ParseContext) => SkugrPageData;

export type FetchKonkPageType = 'sku' | 'skugr';

export type FetchKonkPageDataInput = {
  konk: string;
  url: string;
  type: FetchKonkPageType;
};

export const INVALID_STOCK_PRICE = { stock: -1, price: -1 } as const;
