# Slices

Day meta, points, client-ingest pending/ingest. Dates are wire ISO (`YYYY-MM-DD` or full instant → slice day).

## Routes

| Method | Path                              | Notes                                     |
| ------ | --------------------------------- | ----------------------------------------- |
| `GET`  | `/slices/:konk/days/:date/meta`   | `null` if missing                         |
| `PUT`  | `/slices/:konk/days/:date/meta`   | optional `rotationMeta` / `stats`         |
| `GET`  | `/slices/:konk/days/:date/points` | `{ konkName, date, items }`               |
| `PUT`  | `/slices/:konk/points/:productId` | body `{ date, point }`                    |
| `GET`  | `/slices/:konk/pending`           | open Kyiv day missing/invalid points      |
| `POST` | `/slices/:konk/ingest`            | `{ skuId, html, sourceUrl }` → ingestHtml |

Async day runs go through [slice-jobs](./slice-jobs.md), not sync here.
