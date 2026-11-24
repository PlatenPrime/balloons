import type { CatalogStore, Sku, Skugr } from '@balloons/domain';

export type ResolveKonkProdSkusParams = {
  catalog: CatalogStore;
  konk: string;
  prod: string;
  skugrIds?: string[];
};

export async function resolveKonkProdSkus(params: ResolveKonkProdSkusParams): Promise<Sku[]> {
  const { catalog, konk, prod } = params;
  const all = (await catalog.listSkus({ konkName: konk })).filter((s) => s.prodName === prod);

  if (!params.skugrIds?.length) return all;

  const idSet = new Set<string>();
  for (const id of params.skugrIds) {
    const g = await catalog.getSkugrById(id);
    if (!g || g.konkName !== konk) continue;
    for (const skuId of g.skuIds) idSet.add(skuId);
  }

  return all.filter((s) => idSet.has(s.id));
}

export async function resolveSkusByIds(catalog: CatalogStore, skuIds: string[]): Promise<Sku[]> {
  const out: Sku[] = [];
  const seen = new Set<string>();
  for (const id of skuIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const sku = await catalog.getSkuById(id);
    if (sku) out.push(sku);
  }
  return out;
}

export type SelectionResolveParams = {
  catalog: CatalogStore;
} & (
  | { skuIds: string[]; selectAll?: never }
  | {
      selectAll: true;
      skuIds?: never;
      search?: string;
      konkName?: string;
      prodName?: string;
    }
);

export async function resolveSelectionSkus(params: SelectionResolveParams): Promise<Sku[]> {
  if ('selectAll' in params && params.selectAll === true) {
    let skus = await params.catalog.listSkus(
      params.konkName ? { konkName: params.konkName } : undefined,
    );
    if (params.prodName) skus = skus.filter((s) => s.prodName === params.prodName);
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      skus = skus.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artikul.toLowerCase().includes(q) ||
          s.productId.toLowerCase().includes(q),
      );
    }
    return skus;
  }

  return resolveSkusByIds(params.catalog, params.skuIds);
}

export async function resolveSkugrWithSkus(
  catalog: CatalogStore,
  skugrId: string,
): Promise<{ skugr: Skugr; skus: Sku[] } | null> {
  const skugr = await catalog.getSkugrById(skugrId);
  if (!skugr) return null;
  const skus = await resolveSkusByIds(catalog, skugr.skuIds);
  return { skugr, skus };
}
