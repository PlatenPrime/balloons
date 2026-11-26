# Frontend

Два Vite+React приложения и Chrome extension поверх одного `apps/api`.  
Cutover (Phase 7) запрещён, пока не закрыт DoD Phase 5 — см. [ROADMAP](../ROADMAP.md).

| App       | Путь                 | Роль                                             | Phase   |
| --------- | -------------------- | ------------------------------------------------ | ------- |
| Ops       | `apps/web-slices`    | Срезы, коррекции, catalog CRUD, client-ingest UI | 5.1–5.2 |
| Analytics | `apps/web-analytics` | Charts, statistics, comparison, CI excel         | 5.3     |
| Extension | `apps/extension`     | MV3 HTML capture → ingest API                    | 5.4     |

## Стек

- Vite + React + TypeScript
- TanStack Query, React Router, Zod, react-hook-form
- Tailwind + Radix/shadcn-подобные примитивы **внутри каждого app**
- Общий клиент: `packages/web-api-client` (typed fetch + Zod DTO)

Ориентир UX — CI-часть `btw-wh/web` (пересборка, не копипаст; без склада).

## Локальный запуск

```bash
npm run dev:api
npm run dev:web-slices
npm run dev:web-analytics
npm run build -w @balloons/extension   # or npm run dev:extension
```

| Process       | Port   | Status                                        |
| ------------- | ------ | --------------------------------------------- |
| api           | `3000` | live (`dev:api`)                              |
| web-slices    | `5173` | live (`dev:web-slices`, Phase 5.2 ops)        |
| web-analytics | `5174` | live (`dev:web-analytics`, Phase 5.3 reports) |
| extension     | —      | load unpacked `apps/extension/dist` (5.4)     |

Env scaffold: `apps/web-slices/.env.example` / `apps/web-analytics/.env.example` → `VITE_API_URL=http://localhost:3000`.  
CORS на api разрешает оба frontend origin (`WEB_SLICES_ORIGIN` / `WEB_ANALYTICS_ORIGIN`).

## Документы

- [web-slices.md](./web-slices.md) — маршруты и ops flows
- [web-analytics.md](./web-analytics.md) — маршруты и reports
- [extension.md](./extension.md) — MV3 + bridge
- [../api/README.md](../api/README.md) — группы HTTP-роутов
