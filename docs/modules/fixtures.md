# Fixture packs

Path: `fixtures/pages/<konk>/`.

## Contract

`manifest.json` is validated by `@balloons/domain` Zod schema (`parseFixtureManifest`).

Minimum slots:

| Slot id      | Purpose                                           |
| ------------ | ------------------------------------------------- |
| `sku-page`   | Card → `{ stock, price }` (+ optional `packSize`) |
| `skugr-page` | Listing → `products[]` with `productId`           |

Shape (see ROADMAP §3):

```json
{
  "konk": "_sample",
  "slots": [
    {
      "id": "sku-page",
      "file": "sku-page.html",
      "meta": { "url": "https://example.com/product/1", "productId": "P1" },
      "expected": { "stock": 10, "price": 99.5 }
    }
  ]
}
```

## `_sample` pack

[`fixtures/pages/_sample/`](../../fixtures/pages/_sample/) is the dummy pack for schema/loader/golden checks. HTML is a stub with `data-*` attributes aligned to `expected`.

Loader: `loadFixturePack` + `createFixturePageSource` in `@balloons/browser`. See [browser.md](browser.md).

## Rules

- CI reads fixtures only; live fetch is forbidden in CI.
- `expected` is the source of truth for parser golden tests.
