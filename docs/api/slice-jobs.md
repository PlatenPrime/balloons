# Slice jobs

In-process queue (`createSliceJobQueue`). Kinds: `slice.run`, `compensation.run`, `stock-band.batch-correct`.

## Routes

| Method | Path                     | Notes                                    |
| ------ | ------------------------ | ---------------------------------------- |
| `POST` | `/slice-jobs`            | 202 + job; body discriminated by `kind`  |
| `GET`  | `/slice-jobs`            | `{ items }`                              |
| `GET`  | `/slice-jobs/:id`        | poll                                     |
| `POST` | `/slice-jobs/:id/cancel` | cancel queued/running; no-op if terminal |
