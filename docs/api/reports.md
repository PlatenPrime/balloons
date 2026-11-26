# Reports

JSON aggregates from `@balloons/reporting`. Query params; dates as wire ISO / `YYYY-MM-DD`.

## Routes

| Method | Path                         | Key query params                                       |
| ------ | ---------------------------- | ------------------------------------------------------ |
| `GET`  | `/reports/sku-by-date`       | `skuId`, `date`                                        |
| `GET`  | `/reports/sku-range`         | `skuId`, `dateFrom`, `dateTo`                          |
| `GET`  | `/reports/skugr-daily`       | `skugrId`, `dateFrom`, `dateTo`                        |
| `GET`  | `/reports/skugr-skus-sales`  | `skugrId`, `dateFrom`, `dateTo`                        |
| `GET`  | `/reports/konk-prod-groups`  | `konk`, `prod`, `dateFrom`, `dateTo`                   |
| `GET`  | `/reports/stock-series`      | `konk`, `prod`, `dateFrom`, `dateTo`, `skugrIds?`      |
| `GET`  | `/reports/sales-series`      | same                                                   |
| `GET`  | `/reports/manufacturers-pie` | `konk`, `dateFrom`, `dateTo`                           |
| `GET`  | `/reports/prod-konks-pie`    | `prod`, `dateFrom`, `dateTo`, `excludeKonks?`          |
| `GET`  | `/reports/selection-pie`     | `dateFrom`, `dateTo`, `skuIds` **or** `selectAll=true` |

CSV multi-values: comma-separated (`skugrIds`, `excludeKonks`, `skuIds`).
