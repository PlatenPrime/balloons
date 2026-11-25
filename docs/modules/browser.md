# `@balloons/browser`

HTML parsers, multi-step fixture pipelines, and `fetchKonkPageData`. Live HTTP is off; CI uses disk packs only.

## Universal entry

```ts
fetchKonkPageData(
  { konk, url, type: 'sku' | 'skugr' },
  { fixturesRoot },
): Promise<SkuPageData | SkugrPageData>
```

**`SkuPageData`:** `{ productId?, artikul?, title?, stock, price, packSize? }`  
**`SkugrPageData`:** `{ products: { productId, url?, title? }[] }`

Sentinel: unavailable → `stock/price = -1`; intentional OOS → `stock: 0` with a price when available.

## Parsers (pure HTML)

| API                         | Result          |
| --------------------------- | --------------- |
| `parseSkuPage(html, ctx)`   | `SkuPageData`   |
| `parseSkugrPage(html, ctx)` | `SkugrPageData` |

`ParseContext`: `{ konk, url?, productId? }`. Dispatch via `getSkuParser` / `getSkugrParser`.

Registered konk: `_sample`, `air`, `balun`, `dojdevik`, `yumin`, `sharte`, `perfect`, `svbum`, `partymall`.  
Never: `yumi` (deprecated), `sharik` / btrade.

For cart/AJAX konk (`balun`, `dojdevik`, `sharte`, `perfect`) the HTML registry path is incomplete; use `fetchKonkPageData`.

## Black-box pipeline

- `Stage` + `runPipeline` — ordered units with `StageError { konk, stage, reason }`
- `HttpLike` — narrow get/post used by stages
- `createFixtureTransport({ konk, packDir, slot })` — `fetchHtml` → slot HTML; other `stageKey` → `meta.responses[stageKey]` files (`*.fail.*` → status 500)

Prom cart (`balun`/`dojdevik`): `fetchHtml` → CSRF → `addToCart` → `clampQty` → normalize.  
Sharte: `fetchHtml` → addCart JSON / HTML fallback.  
Perfect: data-product → OOS HTML → cart JSON.

## Fixture pack loader

`loadFixturePack(fixturesRoot, konk)` reads `manifest.json` + slot files. Helpers: `findSlotById`, `findSlotByUrl`.

## `FixturePageSource`

`createFixturePageSource({ fixturesRoot })` implements `PageSource` (HTML only). No network I/O.

## Golden tests

`golden.test.ts` runs `fetchKonkPageData` against every slotted `expected` for all packs. See [fixtures.md](fixtures.md).

## Policy

Comparison is peer konk only. Do not add sharik/`product_rests` or warehouse baselines.
