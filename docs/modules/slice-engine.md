# `@balloons/slice-engine`

Orchestrates slice runs, compensation, pack-flip / band corrections, generic client-ingest, and an in-process `sliceJobs` queue. No HTTP, no Mongo — ports only (`CatalogStore`, `SliceStore`, `PageSource`).

## Deps

```ts
type SliceEngineDeps = {
  catalog: CatalogStore;
  slices: SliceStore;
  pageSource: PageSource;
  getScrapeProfile?: (konk, kind) => ScrapeProfile; // default: resolveScrapeProfile
  delay?: (ms) => Promise<void>; // default: real timer; tests use noOpDelay
};
```

`onSliceStockMutated` is wired on `createInMemorySliceStore({ onSliceStockMutated })`, not on the engine.

## Primary run

`runSliceForKonk({ konk, day, deps, signal? })`:

1. Load SKUs from `isSliced` groups.
2. Skip already-valid points (`!isInvalidSlicePoint`).
3. `PageSource.getSkuPageHtml` → `parseSkuPage` → `upsertPoint`.
4. Soft-fail → `{ stock: -1, price: -1 }`.
5. Abort when `consecutiveInvalidAbort` reached (`abortReason: consecutive_invalid`), or on hard codes `ORIGIN_BLOCKED` / `UNSUPPORTED_KONK`.
6. Throttle via profile `requestJitter` + injectable `delay`.
7. Write `SliceDayMeta.stats` (`filled` / `invalid` / `errorCount` / `dueTotal` / optional `abortReason`).

`runCompensationForKonk` uses calendar `toSliceDate` and reuses the same runner (valid points stay skipped).

## Client-ingest (generic)

- `listPending({ konk, catalog, slices, now? })` — sliced SKUs missing a valid point on `toOpenKyivSliceDate(now)`.
- `ingestHtml({ konk, skuId, html, sourceUrl, ... })` — parse with registered konk parser; write only if missing/invalid; codes: `SKU_NOT_FOUND`, `KONK_MISMATCH`, `NOT_SLICED`, `URL_MISMATCH`, `PARSE_FAILED`.

## Corrections

- Pack-flip: `previewPackFlips` / `applyPackFlips` (domain `decidePackFlipPatchesForSeries`).
- Band-spike: `discoverBandSpike`, `correctBandSpikeRtl` (RTL sandwich; right anchor required).
- Saved bands: `discoverStockBand`, `batchCorrectStockBand` (+ catalog `updateStockBand` / `deleteStockBand`).

## `sliceJobs`

`createSliceJobQueue(deps)` — in-process FIFO, single-flight:

| Kind                       | Payload                                    |
| -------------------------- | ------------------------------------------ |
| `slice.run`                | `{ konk, day }`                            |
| `compensation.run`         | `{ konk, day? }`                           |
| `stock-band.batch-correct` | `{ bandId, productIds, dateFrom, dateTo }` |

API: `create` / `poll` / `cancel` (AbortController for running jobs).

## Tests

Fixture-driven DoD in `sliceEngine.test.ts`: `_sample` pack + `createSeededWorld` → run → compensate → pending/ingest → pack-flip → band batch job.
