# web-analytics (reports)

Приложение: `apps/web-analytics`.  
Phase: **5.3** (после Phase 4 reporting + Phase 5.0 API).  
Общий клиент: `packages/web-api-client`. API: [../api/README.md](../api/README.md).

## Цель

Отчёты и Excel на сырье срезов. Read-heavy: фильтры catalog через API, без тяжёлого CRUD (CRUD в web-slices).

## Маршруты (целевые)

| Path | Назначение |
| ---- | ---------- |
| `/login` | Auth (тот же JWT/api) |
| `/sales` | Sales time series (konk+prod[+skugr]) |
| `/stock` | Stock time series (те же фильтры) |
| `/statistics` | Manufacturer stats / pie за диапазон |
| `/statistics/prod` | Drill по manufacturer |
| `/statistics/skugr` | Drill по группе |
| `/comparison/konks` | Сравнение продаж konk для prod |
| `/comparison/skus` | Сравнение выбранных SKU |
| `/excel` | Order / list / download CI excel-jobs |

Только CI excel kinds (sku catalog/stock/sales/skugr/selection и аналоги). Warehouse kinds — никогда.

## Flows

1. **Chart:** URL filters (konk, prod, range, optional skugr) → Query → Recharts (или аналог).
2. **Statistics drill:** overview → prod → skugr.
3. **Excel:** выбрать kind + params → create `excelJobs` → poll → download.

## UI-паттерн

Тот же стек, что web-slices; отдельный shell (analytics nav).  
Общего UI-kit пакета на старте нет — примитивы внутри app.

## DoD

- Scaffold в CI/`build`; `dev:web-analytics`.
- Хотя бы sales chart + один excel kind открываются на memory данных против api.
