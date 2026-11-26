# web-slices (ops)

Приложение: `apps/web-slices`.  
Phases: **5.1** scaffold → **5.2** ops (закрыта).  
Общий клиент: `packages/web-api-client`. API: [../api/README.md](../api/README.md).

## Цель

Человеком управляемые срезы: catalog, день среза, коррекции, bands/pack-flips, client-ingest.  
CRUD каталога живёт здесь (seed API для справочников; полный CRUD у stock-bands); analytics только читает справочники.

## Локальный запуск

```bash
npm run dev:api
npm run dev:web-slices
npm run build -w @balloons/extension   # optional: Capture via MV3
```

| Process    | Port / env                                                               |
| ---------- | ------------------------------------------------------------------------ |
| api        | `3000`                                                                   |
| web-slices | `5173` (`VITE_API_URL`, default `http://localhost:3000`)                 |
| extension  | load unpacked `apps/extension/dist` (see [extension.md](./extension.md)) |

Demo login: `admin` / `admin` (JWT в `localStorage`, key `balloons.web-slices.token`).  
Seeded demo konk: `air`. Default day на `/slices`: `2026-07-15T00:00:00.000Z` (как API smoke).

## Маршруты

| Path               | Назначение                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| `/login`           | Auth (JWT)                                                                |
| `/health`          | `GET /health` + `GET /auth/me`                                            |
| `/konks`           | Список + seed                                                             |
| `/konks/:name`     | Detail + **client-ingest** panel (`pending` / paste ingest / **Capture**) |
| `/skugrs`          | Список + seed; filters `konkName`, `isSliced`                             |
| `/skugrs/:id`      | Detail                                                                    |
| `/skus`            | Список + seed; filters `konkName`, `isInvalid`                            |
| `/skus/:id`        | Detail                                                                    |
| `/slices`          | Day meta + points; `slice.run` / `compensation.run` / cancel; `putPoint`  |
| `/jobs`            | Список `sliceJobs` + poll/cancel                                          |
| `/pack-flips`      | Preview → apply (`/corrections/pack-flips/*`)                             |
| `/band-spike`      | Discover → preview/apply correct                                          |
| `/stock-bands`     | List + create                                                             |
| `/stock-bands/:id` | Update/delete + discover + batch-correct job                              |
| `/`                | Redirect → `/konks`                                                       |

Исключить: warehouse, btrade/sharik baseline, grabo. Comparison later is peer konk only.

## Flows

1. **Day run:** `/slices?konk=air&day=…` → Run slice → poll banner → day-meta / points (invalid filter).
2. **Compensation / post-corrections:** Compensation = job `compensation.run`; post-correction = ручной `putPoint` на странице slices (отдельного job kind нет).
3. **Discover → correct:** pack-flips preview/apply; band-spike discover/correct; stock-band discover + `stock-band.batch-correct` job.
4. **Client-ingest:** pending list на `/konks/:name` → **Capture** (MV3 extension) или paste HTML → ingest → refresh pending.

## UI-паттерн

Fetcher (TanStack Query) → page container → view; фильтры в URL; jobs через `useSliceJobPoll`.  
Локальные slate/Tailwind примитивы в `src/components/ui` (shadcn-_подобные_, без shadcn CLI).  
Shell/nav только ops.

## DoD

- **5.1:** login + stub catalog/health против api.
- **5.2:** прогон дня по фикстурам виден в UI (статус / точки / jobs) — `/slices` + `/jobs`.
