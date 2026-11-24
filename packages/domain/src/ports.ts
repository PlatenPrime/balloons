import type {
  Konk,
  Prod,
  Sku,
  Skugr,
  SliceDayMeta,
  SliceDayRunStats,
  SlicePoint,
  SliceRotationMeta,
  StockBand,
} from './types.js';

export type CatalogStore = {
  listKonks(): Promise<Konk[]>;
  getKonkByName(name: string): Promise<Konk | null>;
  listProds(): Promise<Prod[]>;
  getProdByName(name: string): Promise<Prod | null>;
  listSkus(filter?: { konkName?: string; isInvalid?: boolean }): Promise<Sku[]>;
  getSkuById(id: string): Promise<Sku | null>;
  getSkuByProductId(productId: string): Promise<Sku | null>;
  listSkugrs(filter?: { konkName?: string; isSliced?: boolean }): Promise<Skugr[]>;
  getSkugrById(id: string): Promise<Skugr | null>;
  listStockBands(filter?: { konkName?: string }): Promise<StockBand[]>;
  getStockBandById(id: string): Promise<StockBand | null>;

  /** Minimal seed API for tests / sandbox. */
  seedKonk(konk: Konk): Promise<Konk>;
  seedProd(prod: Prod): Promise<Prod>;
  seedSku(sku: Sku): Promise<Sku>;
  seedSkugr(skugr: Skugr): Promise<Skugr>;
  seedStockBand(band: StockBand): Promise<StockBand>;
};

export type UpsertSlicePointInput = {
  konkName: string;
  productId: string;
  date: Date;
  point: SlicePoint;
};

export type UpsertSliceDayMetaInput = {
  konkName: string;
  date: Date;
  rotationMeta?: SliceRotationMeta | null;
  stats?: SliceDayRunStats | null;
};

export type SliceStore = {
  getPoint(konkName: string, productId: string, date: Date): Promise<SlicePoint | null>;
  upsertPoint(input: UpsertSlicePointInput): Promise<SlicePoint>;
  listPointsForDay(
    konkName: string,
    date: Date,
  ): Promise<Array<{ productId: string; point: SlicePoint }>>;
  getDayMeta(konkName: string, date: Date): Promise<SliceDayMeta | null>;
  upsertDayMeta(input: UpsertSliceDayMetaInput): Promise<SliceDayMeta>;
};

export type PageSource = {
  getSkuPageHtml(konk: string, url: string): Promise<string>;
  getSkugrPageHtml(konk: string, url: string): Promise<string>;
};

export type SliceStockMutatedEvent = {
  konkName: string;
  day: Date;
  productId: string;
};

export type OnSliceStockMutated = (event: SliceStockMutatedEvent) => void | Promise<void>;
