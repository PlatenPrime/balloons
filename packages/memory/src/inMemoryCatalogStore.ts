import type { CatalogStore, Konk, Prod, Sku, Skugr, StockBand } from '@balloons/domain';

export function createInMemoryCatalogStore(): CatalogStore {
  const konks = new Map<string, Konk>();
  const prods = new Map<string, Prod>();
  const skusById = new Map<string, Sku>();
  const skusByProductId = new Map<string, Sku>();
  const skugrs = new Map<string, Skugr>();
  const bands = new Map<string, StockBand>();

  return {
    async listKonks() {
      return [...konks.values()];
    },
    async getKonkByName(name) {
      return konks.get(name) ?? null;
    },
    async listProds() {
      return [...prods.values()];
    },
    async getProdByName(name) {
      return prods.get(name) ?? null;
    },
    async listSkus(filter) {
      let list = [...skusById.values()];
      if (filter?.konkName !== undefined) {
        list = list.filter((s) => s.konkName === filter.konkName);
      }
      if (filter?.isInvalid !== undefined) {
        list = list.filter((s) => s.isInvalid === filter.isInvalid);
      }
      return list;
    },
    async getSkuById(id) {
      return skusById.get(id) ?? null;
    },
    async getSkuByProductId(productId) {
      return skusByProductId.get(productId) ?? null;
    },
    async listSkugrs(filter) {
      let list = [...skugrs.values()];
      if (filter?.konkName !== undefined) {
        list = list.filter((g) => g.konkName === filter.konkName);
      }
      if (filter?.isSliced !== undefined) {
        list = list.filter((g) => g.isSliced === filter.isSliced);
      }
      return list;
    },
    async getSkugrById(id) {
      return skugrs.get(id) ?? null;
    },
    async listStockBands(filter) {
      let list = [...bands.values()];
      if (filter?.konkName !== undefined) {
        list = list.filter((b) => b.konk.name === filter.konkName);
      }
      return list;
    },
    async getStockBandById(id) {
      return bands.get(id) ?? null;
    },
    async seedKonk(konk) {
      konks.set(konk.name, konk);
      return konk;
    },
    async seedProd(prod) {
      prods.set(prod.name, prod);
      return prod;
    },
    async seedSku(sku) {
      skusById.set(sku.id, sku);
      skusByProductId.set(sku.productId, sku);
      return sku;
    },
    async seedSkugr(skugr) {
      skugrs.set(skugr.id, skugr);
      return skugr;
    },
    async seedStockBand(band) {
      bands.set(band.id, band);
      return band;
    },
  };
}
