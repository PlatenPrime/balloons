# `@balloons/domain`

Types, ports, `sliceDate`, `-1` helpers, scrape profiles, pack-flip detect, and fixture manifest Zod schema. No I/O, no Mongo.

## Types

| Type                   | Role                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `Konk` / `Prod`        | Competitor / manufacturer                                             |
| `Sku` / `Skugr`        | Card + group (`skuIds: string[]`); no `btradeAnalog` — peer konk only |
| `SlicePoint`           | `{ stock, price }` for one day                                        |
| `SliceDayMeta`         | Day-run observability (rotation + stats)                              |
| `StockBand`            | Saved anomalous stock range                                           |
| `ManufacturerDaySales` | Rollup `{ konkName, date, prodName, salesPcs, salesUah }`             |

Ids are plain strings (sandbox-friendly; not ObjectId).

## Ports

- `CatalogStore` — read + seed + stock-band `updateStockBand` / `deleteStockBand`
- `SliceStore` — points by `(konkName, productId, date)` + day-meta + `listPointsForProductRange`
- `ManufacturerDaySalesStore` — materialize replace/list for manufacturer day sales
- `PageSource.getSkuPageHtml(konk, url)` / `getSkugrPageHtml(konk, url)` — HTML source (`FixturePageSource` in `@balloons/browser` for sandbox/CI)
- `OnSliceStockMutated` — hook after point writes

## `sliceDate`

Kyiv timezone `Europe/Kiev`, open hour `20`.

| Scenario   | Function              | Use                         |
| ---------- | --------------------- | --------------------------- |
| `calendar` | `toSliceDate`         | same-day key / compensation |
| `next`     | `toNextKyivSliceDate` | evening cron                |
| `open`     | `toOpenKyivSliceDate` | client-open / interactive   |

`sliceDateForScenario(scenario, d)` dispatches by name. Keys are stored as `YYYY-MM-DDT00:00:00.000Z`.

## `-1` semantics

- Sentinel `-1` means soft-fail / missing usable metric.
- `isValidSliceMetricValue` — finite and not `-1`.
- `isInvalidSlicePoint` — missing point, or `stock === -1 || price === -1`.
- `isFullMinusOneStockPrice` — both sides `-1`.

## Scrape profiles

`resolveScrapeProfile(konk, runKind)` → `ScrapeProfile` (`requestJitter`, optional cluster/block/chunk, `consecutiveInvalidAbort`). `_sample` uses zero delay; `jitterMs` helps throttle.

## Pack-flip detect

Pure helpers: `detectInversePackFlip`, `detectPriceOnlyPackFlip`, `decidePackFlipPatchesForSeries`. Used by `@balloons/slice-engine` preview/apply.

## Fixtures

`parseFixtureManifest` / `fixtureManifestSchema` validate `fixtures/pages/<konk>/manifest.json` (SKU expected may include `artikul`/`title`/`productId`; `meta.responses` for cart mocks). See [fixtures.md](fixtures.md).
