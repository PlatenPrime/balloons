# `@balloons/domain`

Types, ports, `sliceDate`, `-1` helpers, and fixture manifest Zod schema. No I/O, no Mongo.

## Types

| Type            | Role                                     |
| --------------- | ---------------------------------------- |
| `Konk` / `Prod` | Competitor / manufacturer                |
| `Sku` / `Skugr` | Card + group (`skuIds: string[]`)        |
| `SlicePoint`    | `{ stock, price }` for one day           |
| `SliceDayMeta`  | Day-run observability (rotation + stats) |
| `StockBand`     | Saved anomalous stock range              |

Ids are plain strings (sandbox-friendly; not ObjectId).

## Ports

- `CatalogStore` — read + seed for Konk/Prod/Sku/Skugr/StockBand
- `SliceStore` — points by `(konkName, productId, date)` + day-meta
- `PageSource.getSkuPageHtml(konk, url)` — HTML source (fixture/http later)
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

## Fixtures

`parseFixtureManifest` / `fixtureManifestSchema` validate `fixtures/pages/<konk>/manifest.json`. See [fixtures.md](fixtures.md).
