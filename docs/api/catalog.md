# Catalog

Read + minimal sandbox write (`seed*`) over `CatalogStore`. Stock-bands include update/delete + discover / batch-correct job.

## Routes

| Method   | Path                                 | Notes                                   |
| -------- | ------------------------------------ | --------------------------------------- |
| `GET`    | `/catalog/konks`                     | `{ items }`                             |
| `GET`    | `/catalog/konks/:name`               |                                         |
| `POST`   | `/catalog/konks`                     | seed                                    |
| `GET`    | `/catalog/prods`                     |                                         |
| `GET`    | `/catalog/prods/:name`               |                                         |
| `POST`   | `/catalog/prods`                     | seed                                    |
| `GET`    | `/catalog/skus`                      | query: `konkName`, `isInvalid`          |
| `GET`    | `/catalog/skus/:id`                  |                                         |
| `POST`   | `/catalog/skus`                      | seed                                    |
| `GET`    | `/catalog/skugrs`                    | query: `konkName`, `isSliced`           |
| `GET`    | `/catalog/skugrs/:id`                |                                         |
| `POST`   | `/catalog/skugrs`                    | seed                                    |
| `GET`    | `/catalog/stock-bands`               | query: `konkName`                       |
| `POST`   | `/catalog/stock-bands`               | seed                                    |
| `GET`    | `/catalog/stock-bands/:id`           |                                         |
| `PUT`    | `/catalog/stock-bands/:id`           | full band body                          |
| `DELETE` | `/catalog/stock-bands/:id`           | `{ ok: true }`                          |
| `POST`   | `/catalog/stock-bands/discover`      | sync discover via engine                |
| `POST`   | `/catalog/stock-bands/batch-correct` | enqueues `stock-band.batch-correct` job |

All routes require JWT. Zod DTOs: `@balloons/web-api-client`.
