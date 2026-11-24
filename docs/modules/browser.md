# `@balloons/browser`

HTML parsers + fixture pack loader. Live HTTP is off; CI uses disk packs only.

## Parsers

| API                         | Result                                |
| --------------------------- | ------------------------------------- |
| `parseSkuPage(html, ctx)`   | `{ stock, price, packSize? }`         |
| `parseSkugrPage(html, ctx)` | `{ products: { productId, url? }[] }` |

`ParseContext`: `{ konk, url?, productId? }`.

Dispatch is by `konk` via `getSkuParser` / `getSkugrParser`. Unknown konk throws.

Registered now:

| konk      | Notes                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| `_sample` | Stub HTML: `[data-stock]` / `[data-price]`, `[data-product-id]` (+ optional `data-url`) |

New konk = register parsers + add `fixtures/pages/<konk>/` pack (no runner copy-paste).

## Fixture pack loader

`loadFixturePack(fixturesRoot, konk)`:

1. Reads `manifest.json` through `parseFixtureManifest` (`@balloons/domain`)
2. Loads each slot `file` as HTML from disk

Helpers: `findSlotById`, `findSlotByUrl`.

## `FixturePageSource`

`createFixturePageSource({ fixturesRoot })` implements `PageSource`:

- `getSkuPageHtml(konk, url)` — match `sku-page` by `meta.url`, else fall back to slot id
- `getSkugrPageHtml(konk, url)` — same for `skugr-page`

No network I/O.

## Golden tests

`packages/browser/src/golden.test.ts` loads `_sample`, runs parsers, asserts deep-equal to each slot `expected`. See [fixtures.md](fixtures.md).
