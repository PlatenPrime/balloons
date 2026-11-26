# web-analytics (reports)

Приложение: `apps/web-analytics`.  
Phase: **5.3** (после Phase 4 + 4.1 reporting + Phase 5.0 API).  
Общий клиент: `packages/web-api-client`. API: [../api/README.md](../api/README.md).

## Цель

Отчёты и Excel на сырье срезов. Read-heavy: фильтры catalog через API, без тяжёлого CRUD (CRUD в web-slices).

## Локальный запуск

```bash
npm run dev:api
npm run dev:web-analytics
```

|            |                                                                       |
| ---------- | --------------------------------------------------------------------- |
| Port       | `5174` (`strictPort`)                                                 |
| Env        | `VITE_API_URL` (default `http://localhost:3000`) — см. `.env.example` |
| Demo login | `admin` / `admin`                                                     |
| Token key  | `balloons.web-analytics.token` (отдельный от web-slices)              |

API seed (composition) поднимает catalog `air` / `sample-prod` и **три demo slice points** (2026-07-14…16) с materialize — `/sales` и `/stock` непустые без ручного putPoint.

## Маршруты

| Path                | Назначение                            | API                                            |
| ------------------- | ------------------------------------- | ---------------------------------------------- |
| `/login`            | Auth (тот же JWT/api)                 | `POST /auth/login`                             |
| `/sales`            | Sales time series (konk+prod[+skugr]) | `GET /reports/sales-series`                    |
| `/stock`            | Stock time series                     | `GET /reports/stock-series`                    |
| `/statistics`       | Manufacturer pie                      | `GET /reports/manufacturers-pie`               |
| `/statistics/prod`  | Drill по manufacturer → skugr groups  | `GET /reports/konk-prod-groups`                |
| `/statistics/skugr` | Drill по группе                       | `GET /reports/skugr-daily`, `skugr-skus-sales` |
| `/comparison/konks` | Peer konk comparison для prod         | `GET /reports/prod-konks-pie`                  |
| `/comparison/skus`  | Сравнение выбранных competitor SKU    | `GET /reports/selection-pie`                   |
| `/excel`            | Order / list / download CI excel-jobs | `/excel-jobs*`                                 |

Только CI excel kinds (`sku-catalog-*`, `sku-one-*`, `sku-skugr-*`, `sku-konk-*`, `sku-selection-*`). Warehouse kinds — никогда.

Default URL filters: `konk=air`, `prod=sample-prod`, `dateFrom=2026-07-14`, `dateTo=2026-07-16`.

## Flows

1. **Chart:** URL filters → TanStack Query → Recharts line/pie.
2. **Statistics drill:** overview → prod → skugr (ссылки в таблице/списке).
3. **Excel:** выбрать kind + JSON params → create → poll → download blob.

## UI-паттерн

Тот же стек, что web-slices (Vite + React + TS + TanStack Query + Router + Tailwind v4); отдельный shell (analytics nav).  
Общего UI-kit пакета нет — примитивы внутри app. Charts: **Recharts**.  
Build: report/excel pages через `React.lazy`; Vite 8 `codeSplitting` groups — `recharts` + `vendor-react` (entry без 500 KB warning).

## Тесты

Unit (vitest node, без RTL — как web-slices): page behavior покрыт через pure helpers в `src/lib/`:

- auth: `session`, `guard`, `loginRedirect`
- filters: `urlSearch`
- reports: `reportSeries`, `reportPies`
- excel: `excelJobStatus`, `excelParams`

Страницы тонкие: Query + helpers; публичные ветки (null/empty series, redirect `from`, kind defaults, selection query) — в `*.test.ts`.

## DoD

- Scaffold в CI/`build`; `dev:web-analytics`.
- Sales chart + excel kind (`sku-one-sales` по умолчанию) на memory данных против api.
