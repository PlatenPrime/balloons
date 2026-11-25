# Fixture packs

Path: `fixtures/pages/<konk>/`.

## Contract

`manifest.json` is validated by `@balloons/domain` Zod schema (`parseFixtureManifest`).

Minimum slots:

| Slot id      | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| `sku-page`   | Card → `{ stock, price, artikul?, title?, productId?, packSize? }` |
| `skugr-page` | Listing → `products[]` with `productId` (+ optional `url`/`title`) |

Extended slots: `sku-oos`, `sku-discount`, `sku-pack`, `sku-cart`, `sku-cart-fail`, …

`meta.responses` maps pipeline stage ids → companion files under the pack (cart/GraphQL/AJAX mocks).

```json
{
  "konk": "balun",
  "slots": [
    {
      "id": "sku-page",
      "file": "sku-page.html",
      "meta": {
        "url": "https://balun.example/p123/",
        "responses": {
          "addToCart": "responses/add-to-cart.ok.json",
          "clampQty": "responses/clamp-qty.ok.json"
        }
      },
      "expected": { "stock": 7, "price": 12.5, "artikul": "BL-01" }
    }
  ]
}
```

## Packs

| konk        | Notes                                  |
| ----------- | -------------------------------------- |
| `_sample`   | Stub `data-*` smoke                    |
| `air`       | HTML stock/price                       |
| `balun`     | Prom GraphQL cart mocks                |
| `dojdevik`  | Prom cart + pack rescale               |
| `yumin`     | HTML attrs; SKUGR JSON listing         |
| `sharte`    | addCart JSON + HTML fallback           |
| `perfect`   | data-product / OOS / cart mocks        |
| `svbum`     | OpenCart HTML (+ options OOS/discount) |
| `partymall` | OpenCart-like HTML + pack attr         |

Out of scope: `yumi` (deprecated), `sharik` / btrade.

Loader + `fetchKonkPageData`: `@balloons/browser`. See [browser.md](browser.md).

## Rules

- CI reads fixtures only; live fetch is forbidden in CI.
- `expected` is the source of truth for golden tests (`fetchKonkPageData`).
- Comparison is peer konk only — never vs sharik/btrade/warehouse.
