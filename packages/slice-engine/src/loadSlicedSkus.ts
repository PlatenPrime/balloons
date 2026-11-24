import type { CatalogStore, Sku } from '@balloons/domain';

/** SKUs that belong to at least one `isSliced` group for the konk. */
export async function loadSlicedSkusForKonk(
  catalog: CatalogStore,
  konkName: string,
): Promise<Sku[]> {
  const groups = await catalog.listSkugrs({ konkName, isSliced: true });
  const ids = new Set<string>();
  for (const g of groups) {
    for (const id of g.skuIds) {
      ids.add(id);
    }
  }

  const out: Sku[] = [];
  for (const id of ids) {
    const sku = await catalog.getSkuById(id);
    if (!sku) continue;
    if (sku.konkName !== konkName) continue;
    if (!sku.productId.trim() || !sku.url.trim()) continue;
    out.push(sku);
  }

  out.sort((a, b) => a.productId.localeCompare(b.productId));
  return out;
}
