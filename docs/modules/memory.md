# `@balloons/memory`

In-memory adapters for domain ports. Used in unit/integration tests and early sandbox runs.

## API

- `createInMemoryCatalogStore()` — `CatalogStore` (includes stock-band `updateStockBand` / `deleteStockBand`)
- `createInMemorySliceStore({ onSliceStockMutated? })` — `SliceStore`; normalizes dates via `toSliceDate`; fires the mutation hook after `upsertPoint`
- `createSeededWorld(input?)` — factory that seeds Konk/Prod/Sku/Skugr/StockBand and optional points

No Mongo. Persistence is process-local `Map`s only.
