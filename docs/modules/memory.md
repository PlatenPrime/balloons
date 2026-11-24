# `@balloons/memory`

In-memory adapters for domain ports. Used in unit/integration tests and early sandbox runs.

## API

- `createInMemoryCatalogStore()` — `CatalogStore` (includes stock-band `updateStockBand` / `deleteStockBand`)
- `createInMemorySliceStore({ onSliceStockMutated? })` — `SliceStore`; normalizes dates via `toSliceDate`; fires the mutation hook after `upsertPoint`; supports `listPointsForProductRange`
- `createInMemoryManufacturerDaySalesStore()` — `ManufacturerDaySalesStore` (replace day / list by konk or prod range)
- `createSeededWorld(input?)` — factory that seeds Konk/Prod/Sku/Skugr/StockBand, optional points, and empty `sales` store

No Mongo. Persistence is process-local `Map`s only.
