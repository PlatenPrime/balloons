# Corrections

Pack-flips and band-spike helpers from `@balloons/slice-engine`. Stock-band discover/batch also under [catalog](./catalog.md).

## Routes

| Method | Path                               | Notes                                    |
| ------ | ---------------------------------- | ---------------------------------------- |
| `POST` | `/corrections/pack-flips/preview`  | `{ konk, productIds, dateFrom, dateTo }` |
| `POST` | `/corrections/pack-flips/apply`    | same body                                |
| `POST` | `/corrections/band-spike/discover` | + `stockMin`/`stockMax`/`normalMax?`     |
| `POST` | `/corrections/band-spike/correct`  | + `productId`, `band`, `apply`           |
