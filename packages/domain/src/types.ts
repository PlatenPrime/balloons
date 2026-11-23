/** Competitor identity (`konk.name` is the stable key). */
export type Konk = {
  id: string;
  name: string;
  title: string;
  url: string;
  imageUrl: string;
  recountDays: string[];
};

/** Manufacturer / brand. */
export type Prod = {
  id: string;
  name: string;
  title: string;
  imageUrl: string;
};

/** Competitor SKU card. */
export type Sku = {
  id: string;
  konkName: string;
  prodName: string;
  /** Canonical key: `{konkNameLower}-{rawProductId}`. */
  productId: string;
  artikul: string;
  btradeAnalog: string;
  title: string;
  url: string;
  imageUrl: string;
  isInvalid: boolean;
};

/** Group of SKUs for one konk + prod. */
export type Skugr = {
  id: string;
  konkName: string;
  prodName: string;
  title: string;
  url: string;
  isSliced: boolean;
  /** Sku.id references (string ids, not ObjectId). */
  skuIds: string[];
};

/** One day stock/price observation. */
export type SlicePoint = {
  stock: number;
  price: number;
};

export type SliceRotationMeta = {
  cycleDays: number;
  dayIndex: number;
  dueCount: number;
};

export type SliceDayRunStats = {
  filled: number;
  invalid: number;
  errorCount: number;
  dueTotal?: number;
  abortReason?: string;
};

/** Observability for a konk day run (no points). */
export type SliceDayMeta = {
  konkName: string;
  /** Slice day key: `YYYY-MM-DDT00:00:00.000Z`. */
  date: Date;
  rotationMeta?: SliceRotationMeta;
  stats?: SliceDayRunStats;
};

export type StockBandKonk = {
  name: string;
  title: string;
};

/** Saved anomalous stock band for a competitor. */
export type StockBand = {
  id: string;
  konk: StockBandKonk;
  stockMin: number;
  stockMax: number;
  normalMax: number;
};

export type SlicePointKey = {
  konkName: string;
  productId: string;
  date: Date;
};
