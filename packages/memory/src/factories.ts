import type { Konk, Prod, Sku, Skugr, StockBand } from '@balloons/domain';
import { createInMemoryCatalogStore } from './inMemoryCatalogStore.js';
import { createInMemorySliceStore, type InMemorySliceStoreOptions } from './inMemorySliceStore.js';

export type SeedWorldInput = {
  konk?: Partial<Konk> & Pick<Konk, 'name'>;
  prod?: Partial<Prod> & Pick<Prod, 'name'>;
  sku?: Partial<Sku>;
  skugr?: Partial<Skugr>;
  stockBand?: Partial<StockBand>;
  points?: Array<{
    productId?: string;
    date: Date;
    stock: number;
    price: number;
  }>;
  sliceStoreOptions?: InMemorySliceStoreOptions;
};

export type SeededWorld = {
  catalog: ReturnType<typeof createInMemoryCatalogStore>;
  slices: ReturnType<typeof createInMemorySliceStore>;
  konk: Konk;
  prod: Prod;
  sku: Sku;
  skugr: Skugr;
  stockBand: StockBand;
};

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function createSeededWorld(input: SeedWorldInput = {}): Promise<SeededWorld> {
  return seedWorld(input);
}

async function seedWorld(input: SeedWorldInput): Promise<SeededWorld> {
  const catalog = createInMemoryCatalogStore();
  const slices = createInMemorySliceStore(input.sliceStoreOptions);

  const konkName = input.konk?.name ?? 'air';
  const prodName = input.prod?.name ?? 'sample-prod';

  const konk: Konk = {
    id: input.konk?.id ?? nextId('konk'),
    name: konkName,
    title: input.konk?.title ?? 'Air',
    url: input.konk?.url ?? 'https://example.com',
    imageUrl: input.konk?.imageUrl ?? '',
    recountDays: input.konk?.recountDays ?? [],
  };

  const prod: Prod = {
    id: input.prod?.id ?? nextId('prod'),
    name: prodName,
    title: input.prod?.title ?? 'Sample Prod',
    imageUrl: input.prod?.imageUrl ?? '',
  };

  const productId = input.sku?.productId ?? `${konkName}-P1`;
  const sku: Sku = {
    id: input.sku?.id ?? nextId('sku'),
    konkName,
    prodName,
    productId,
    artikul: input.sku?.artikul ?? 'A1',
    btradeAnalog: input.sku?.btradeAnalog ?? '',
    title: input.sku?.title ?? 'Sample SKU',
    url: input.sku?.url ?? 'https://example.com/product/1',
    imageUrl: input.sku?.imageUrl ?? '',
    isInvalid: input.sku?.isInvalid ?? false,
  };

  const skugr: Skugr = {
    id: input.skugr?.id ?? nextId('skugr'),
    konkName,
    prodName,
    title: input.skugr?.title ?? 'Sample group',
    url: input.skugr?.url ?? 'https://example.com/group/1',
    isSliced: input.skugr?.isSliced ?? true,
    skuIds: input.skugr?.skuIds ?? [sku.id],
  };

  const stockBand: StockBand = {
    id: input.stockBand?.id ?? nextId('band'),
    konk: input.stockBand?.konk ?? { name: konkName, title: konk.title },
    stockMin: input.stockBand?.stockMin ?? 100,
    stockMax: input.stockBand?.stockMax ?? 200,
    normalMax: input.stockBand?.normalMax ?? 50,
  };

  await catalog.seedKonk(konk);
  await catalog.seedProd(prod);
  await catalog.seedSku(sku);
  await catalog.seedSkugr(skugr);
  await catalog.seedStockBand(stockBand);

  for (const p of input.points ?? []) {
    await slices.upsertPoint({
      konkName,
      productId: p.productId ?? productId,
      date: p.date,
      point: { stock: p.stock, price: p.price },
    });
  }

  return { catalog, slices, konk, prod, sku, skugr, stockBand };
}
