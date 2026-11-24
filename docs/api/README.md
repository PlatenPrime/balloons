# API

Приложение: `apps/api` (один Express-процесс: срезы + отчёты + jobs).  
Phase **5.0** — HTTP surface на memory/engine/reporting. Детали роутов добавлять сюда по мере реализации.

Фронты: [../frontend/README.md](../frontend/README.md). Cutover только после DoD Phase 5 — [../ROADMAP.md](../ROADMAP.md).

## Уже есть

| Method | Path      | Notes                    |
| ------ | --------- | ------------------------ |
| `GET`  | `/health` | `{ ok: true }` (Phase 0) |

## Группы роутов (Phase 5.0)

| Group              | Назначение                                                                          | Consumers                                       |
| ------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| Auth               | Login / JWT; in-memory users                                                        | оба web, extension                              |
| Catalog            | Konk / Prod / Sku / Skugr read + минимальный write для ops                          | web-slices (CRUD), web-analytics (read filters) |
| Slices             | Day-meta, points, run, compensation, post-corrections, client-ingest pending/ingest | web-slices, extension                           |
| Slice jobs         | create / poll / cancel (`sliceJobs`)                                                | web-slices                                      |
| Corrections extras | Pack-flips, band-spike, stock-bands CRUD + discover/batch-correct                   | web-slices                                      |
| Reports            | JSON sales / stock / statistics / comparison aggregates                             | web-analytics                                   |
| Excel jobs         | create / poll / download (CI kinds only)                                            | web-analytics                                   |
| Browser debug      | Fixture/parser debug helpers (local)                                                | web-slices (optional)                           |

## Cross-cutting

- **CORS:** origins `web-slices` и `web-analytics` (типично `http://localhost:5173`, `http://localhost:5174`).
- **Auth:** JWT; те же credentials для обоих фронтов.
- **Persist:** in-memory до Phase 7; без Mongo на 0–6.
- **Client:** `packages/web-api-client` — typed fetch + Zod DTO.

## Документы по роутам

Добавлять файлы вида `docs/api/<group>.md` вместе с реализацией роутера (правило docs-with-code).
