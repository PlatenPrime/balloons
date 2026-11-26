# extension (client-ingest)

Приложение: `apps/extension`.  
Phase: **5.4**.  
Зависит от Phase 5.0 ingest API и UI pending в web-slices (5.2).

## Цель

Chrome MV3: захват HTML страницы конкурента → balloons API (`listPending` / `ingestHtml`), **generic по konk** (не только air).

## Локальный запуск

```bash
npm run dev:api
npm run dev:web-slices
npm run build -w @balloons/extension   # или npm run dev:extension (watch)
```

1. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `apps/extension/dist`.
2. Login в web-slices (`http://localhost:5173`, `admin` / `admin`).
3. `/konks/:name` → Client ingest → **Capture** на pending SKU (вкладка с matching `sourceUrl` откроется/переиспользуется).

| Piece        | Path / note                                      |
| ------------ | ------------------------------------------------ |
| Unpacked dir | `apps/extension/dist` after `build`              |
| API          | `http://localhost:3000` (JWT Bearer)             |
| Bridge host  | content script on `http://localhost:5173/*`      |
| Popup        | status: API URL, token present/missing, last err |

## Компоненты

| Часть             | Назначение                                                              |
| ----------------- | ----------------------------------------------------------------------- |
| Service worker    | `background.js` — messaging, tab capture, ingest                        |
| Content / capture | `content.js` на web-slices origin; `scripting.executeScript` на SKU     |
| Bridge            | `window.postMessage` ↔ content ↔ SW; JWT из `balloons.web-slices.token` |
| API calls         | `@balloons/web-api-client` `ingestHtml` в SW                            |

Парсинг HTML **только на API** (`@balloons/browser`) — extension сырой HTML не парсит.

## Messaging protocol

`source: "balloons-extension-bridge"`:

| type              | Direction        | Payload                                         |
| ----------------- | ---------------- | ----------------------------------------------- |
| `TOKEN_SYNC`      | page → extension | `token`, optional `apiBaseUrl`                  |
| `CAPTURE_REQUEST` | page → extension | `requestId`, `konk`, `skuId`, `sourceUrl`, …    |
| `CAPTURE_RESULT`  | extension → page | success (`status`, metrics) or `code`/`message` |

web-slices: `features/ingest/extensionBridge.ts` + кнопка **Capture** в `ClientIngestPanel`.

## Flow

```text
web-slices: pending list for konk
    → Capture (postMessage + JWT)
    → content script → service worker
    → find/open tab for sourceUrl → outerHTML
    → POST /slices/:konk/ingest
    → CAPTURE_RESULT → invalidate pending query
```

## Permissions

- `storage`, `scripting`, `tabs`
- `host_permissions`: `http://localhost:3000/*`, `http://*/*`, `https://*/*` (generic konk URLs)

## Не в scope MVP

- Skugr-fill отдельный канал (backlog ROADMAP)
- Warehouse / unrelated site automation
- Chrome Web Store / fixed extension ID
- Cart-only konk HTML paths (`balun` / `dojdevik`) — ограничение API parsers

## DoD

- [x] `apps/extension` MV3
- [x] Bridge с JWT / session из web-slices
- [x] Capture HTML → pending/ingest API
- [x] `docs/frontend/extension.md`

Capture → pending/ingest через api; pending UI в web-slices обновляется после ingest.
