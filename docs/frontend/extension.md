# extension (client-ingest)

Приложение: `apps/extension`.  
Phase: **5.4**.  
Зависит от Phase 5.0 ingest API и UI pending в web-slices (5.2).

## Цель

Chrome MV3: захват HTML страницы конкурента → balloons API (`listPending` / `ingestHtml`), **generic по konk** (не только air).

## Компоненты

| Часть             | Назначение                                                            |
| ----------------- | --------------------------------------------------------------------- |
| Service worker    | MV3 background; messaging                                             |
| Content / capture | Снять HTML текущей вкладки                                            |
| Bridge            | Обмен с web-slices (JWT / session / ping)                             |
| API calls         | Typed client (`web-api-client` или тонкая обёртка) → ingest endpoints |

Ориентир поведения: `btw-wh` air-capture + SPA bridge — пересобрать без hardcode одного konk.

## Flow

```text
web-slices: pending list for konk
    → extension ping / capture request
    → capture HTML from tab
    → POST/PUT ingest API
    → web-slices refreshes pending / day points
```

## Не в scope MVP

- Skugr-fill отдельный канал (backlog ROADMAP)
- Warehouse / unrelated site automation

## DoD

Capture → pending/ingest через api; pending UI в web-slices обновляется после ingest.
