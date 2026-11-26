# web-slices (ops)

Приложение: `apps/web-slices`.  
Phases: **5.1** scaffold → **5.2** ops.  
Общий клиент: `packages/web-api-client`. API: [../api/README.md](../api/README.md).

## Цель

Человеком управляемые срезы: catalog, день среза, коррекции, bands/pack-flips, client-ingest.  
CRUD каталога живёт здесь; analytics только читает справочники.

## Локальный запуск (Phase 5.1+)

```bash
npm run dev:api
npm run dev:web-slices
```

| Process    | Port / env                                               |
| ---------- | -------------------------------------------------------- |
| api        | `3000`                                                   |
| web-slices | `5173` (`VITE_API_URL`, default `http://localhost:3000`) |

Demo login: `admin` / `admin` (JWT в `localStorage`, key `balloons.web-slices.token`).

## Маршруты scaffold (5.1)

| Path      | Назначение                           |
| --------- | ------------------------------------ |
| `/login`  | Auth form → `POST /auth/login`       |
| `/health` | Stub: `GET /health` + `GET /auth/me` |
| `/konks`  | Stub catalog: `GET /catalog/konks`   |
| `/`       | Redirect → `/konks`                  |

Protected shell/nav: Health, Konks; остальные ops-ссылки — disabled stubs до 5.2.

## Маршруты (целевые, 5.2)

| Path               | Назначение                                           |
| ------------------ | ---------------------------------------------------- |
| `/login`           | Auth (JWT)                                           |
| `/konks`           | Список конкурентов                                   |
| `/konks/:id`       | Detail + **client-ingest** panel (generic konk)      |
| `/skugrs`          | Группы товаров                                       |
| `/skugrs/:id`      | Detail группы                                        |
| `/skus`            | Competitor SKUs                                      |
| `/skus/:id`        | Detail SKU                                           |
| `/slices`          | Day status + invalid points; запуск/poll `sliceJobs` |
| `/pack-flips`      | Discover pack-flip за диапазон                       |
| `/band-spike`      | Discover stock spikes в band + correct               |
| `/stock-bands`     | CRUD anomalous stock-bands                           |
| `/stock-bands/:id` | Detail + discover + batch-correct                    |
| `/jobs`            | Статус `sliceJobs` (или встроено в slices header)    |

Исключить: warehouse, btrade/sharik baseline, grabo (rejected / never). Comparison later is peer konk only.

## Flows

1. **Day run:** выбрать konk+day → create `sliceJobs` → poll → day-meta / invalid list.
2. **Compensation / post-corrections:** действия с `/slices` → job kinds → poll.
3. **Discover → correct:** pack-flips / band-spike / stock-band discover → preview → apply / batch-correct job.
4. **Client-ingest:** pending list на konk → extension capture → ingest API → UI refresh.

## UI-паттерн

Fetcher → Container → View; фильтры в URL; jobs с poll/toast.  
Shell/nav только ops (без analytics-разделов).  
Стек 5.1: Vite + React + TS + TanStack Query + React Router + Tailwind + Zod + react-hook-form (без shadcn — Phase 5.2).

## DoD

- **5.1:** login + stub catalog/health против api.
- **5.2:** прогон дня по фикстурам виден в UI (статус / точки / jobs).
