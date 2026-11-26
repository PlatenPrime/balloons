# Browser debug

Local fixture/parser helpers. No live network.

## Routes

| Method | Path                         | Body                               |
| ------ | ---------------------------- | ---------------------------------- |
| `POST` | `/browser-debug/parse-sku`   | `{ konk, html, url?, productId? }` |
| `POST` | `/browser-debug/parse-skugr` | `{ konk, html, url?, productId? }` |

Unknown konk parser → 400.
