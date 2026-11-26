# API

Приложение: `apps/api` (один Express-процесс: срезы + отчёты + jobs).  
Phase **5.0** — HTTP surface на memory/engine/reporting. Typed client: `@balloons/web-api-client`.

Фронты: [../frontend/README.md](../frontend/README.md). Cutover только после DoD Phase 5 — [../ROADMAP.md](../ROADMAP.md).

## Уже есть

| Method | Path      | Auth | Notes          |
| ------ | --------- | ---- | -------------- |
| `GET`  | `/health` | no   | `{ ok: true }` |

Детали по группам:

- [auth.md](./auth.md)
- [catalog.md](./catalog.md)
- [slices.md](./slices.md)
- [slice-jobs.md](./slice-jobs.md)
- [corrections.md](./corrections.md)
- [reports.md](./reports.md)
- [excel-jobs.md](./excel-jobs.md)
- [browser-debug.md](./browser-debug.md)

## Cross-cutting

- **CORS:** `http://localhost:5173` (web-slices), `http://localhost:5174` (web-analytics); override via `WEB_SLICES_ORIGIN` / `WEB_ANALYTICS_ORIGIN`.
- **Auth:** JWT HS256; in-memory users (`AUTH_USERNAME` / `AUTH_PASSWORD`).
- **Persist:** in-memory + fixture `PageSource` до Phase 7; без Mongo.
- **Client:** `packages/web-api-client` — Zod DTO + `createWebApiClient`.

## Dev

```bash
npm run dev:api
```

Defaults: port `3000`, user `admin` / `admin`.
