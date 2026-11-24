export type ParseContext = {
  konk: string;
  url?: string;
  productId?: string;
};

export type ParsedSkuPage = {
  stock: number;
  price: number;
  packSize?: number;
};

export type ParsedSkugrProduct = {
  productId: string;
  url?: string;
};

export type ParsedSkugrPage = {
  products: ParsedSkugrProduct[];
};

export type SkuPageParser = (html: string, ctx: ParseContext) => ParsedSkuPage;
export type SkugrPageParser = (html: string, ctx: ParseContext) => ParsedSkugrPage;
