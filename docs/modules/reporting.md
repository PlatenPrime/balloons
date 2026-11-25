# `@balloons/reporting`

Manufacturer day sales materialize, JSON aggregates, Excel builders, and `excelJobs` (worker_threads). No HTTP, no Mongo — ports only.

## Deps

```ts
type MaterializeDeps = {
  catalog: CatalogStore;
  slices: SliceStore;
  sales: ManufacturerDaySalesStore;
};
```

Wire the hook on the slice store (not the engine):

```ts
const deps = { catalog, slices: undefined!, sales };
const onSliceStockMutated = createMaterializeOnSliceStockMutated(deps);
deps.slices = createInMemorySliceStore({ onSliceStockMutated });
```

## Sales formula (write-path)

For day `D` vs `D-1` raw stocks:

- `currStock === -1` → `salesPcs/salesUah = 0`
- stock increase → delivery day, sales 0
- else `salesPcs = prev - curr`, then `Konk.recountDays` may zero the day
- `salesUah = salesPcs × price` (2 dp)

Rematerialize after a mutation covers **D and D+1**.

## Coalesce

`scheduleAfterSliceStockMutation` — per `(konk, day)` dirty + singleflight + trailing. Returns immediately (void). Tests: `flushScheduledMaterialize()`.

Read-path Excel/series may forward-fill via `coalesceSlicePointsAlongDates` (`-1`/gaps do not update carry).

## JSON aggregates

Peer konk comparison only (never vs btrade/sharik/warehouse). Library functions close to wh CI shapes:

| Function                                                  | Role                 |
| --------------------------------------------------------- | -------------------- |
| `reportSkuByDate` / `reportSkuRange`                      | SKU sales drill      |
| `reportSkugrDailySummary` / `reportSkugrSkusSales`        | Skugr                |
| `reportKonkProdSkugrGroupsSales`                          | Groups for konk+prod |
| `reportKonkProdStockSeries` / `reportKonkProdSalesSeries` | Charts               |
| `reportManufacturersPie` / `reportProdKonksPie`           | Statistics pies      |
| `reportSelectionSkusPie`                                  | Selection + shares   |

Without `skugrIds`, sales series prefers `ManufacturerDaySalesStore` rollup.

## Excel + `excelJobs`

CI kinds only: `sku-catalog-*`, `sku-one-*`, `sku-skugr-*`, `sku-konk-*`, `sku-selection-*`.

`createExcelJobQueue({ catalog, slices })`:

- API: `create` / `poll` / `cancel` / `list` / `getFile`
- Statuses: `queued` \| `running` \| `ready` \| `failed` \| `cancelled`
- Default build: snapshot on main → `worker_threads` (`excelJobWorker`); `useInProcessBuild` / injectable `build` for tests

Independent from `sliceJobs` (separate FIFO pump).

`includeImages` is accepted in params but embedding is not implemented (Phase 4).

## Tests

`salesMath.test.ts` + `reporting.test.ts`: manual rollup parity, coalesce bound, hook→pie, excel ready buffer, worker_threads signal, independent scheduling vs `sliceJobs`.
