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

## Локальный запуск (после Phase 5.x)

Планируемые root scripts:

```bash
npm run dev:api
npm run dev:web-slices
npm run dev:web-analytics
```

Типичные ports (зафиксировать в app `.env` при scaffold):

| Process       | Port   |
| ------------- | ------ |
| api           | `3000` |
| web-slices    | `5173` |
| web-analytics | `5174` |

CORS на api должен разрешать оба frontend origin.

## Документы

- [web-slices.md](./web-slices.md) — маршруты и ops flows
- [web-analytics.md](./web-analytics.md) — маршруты и reports
- [extension.md](./extension.md) — MV3 + bridge
- [../api/README.md](../api/README.md) — группы HTTP-роутов
