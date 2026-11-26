# Excel jobs

CI kinds only (`EXCEL_SKU_KINDS`). Queue from `createExcelJobQueue` (in-process build by default in tests/dev).

## Routes

| Method | Path                     | Notes                                         |
| ------ | ------------------------ | --------------------------------------------- |
| `POST` | `/excel-jobs`            | `{ kind, params }` → 202 job                  |
| `GET`  | `/excel-jobs`            | `{ items }` (no buffers)                      |
| `GET`  | `/excel-jobs/:id`        | poll                                          |
| `POST` | `/excel-jobs/:id/cancel` | cancel queued/running                         |
| `GET`  | `/excel-jobs/:id/file`   | binary xlsx when `status === ready`; else 404 |

`params.dateFrom` / `dateTo` for builders: `YYYY-MM-DD`.
