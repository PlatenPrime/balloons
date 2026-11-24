# ROADMAP balloons

Статус прогресса ведётся чекбоксами в этом файле.  
Разработка фаз — в воркспейсе `balloons`, отдельными сессиями.

---

## 0. Назначение продукта

`balloons` — отдельный продукт **конкурентной разведки**:

1. Сбор и коррекция **срезов** остатков/цен SKU конкурентов.
2. **Отчёты** (JSON sales/charts + Excel) на сырье срезов.
3. Ops-UI срезов + Analytics-UI + Chrome extension для client-ingest.

Склад остаётся в `btw-wh-server` и **не входит** в balloons.

Долгосрочно оба продукта могут смотреть в одну Mongo; **до cutover balloons работает как песочница** без прод-деплоя и без прод-БД.

---

## 1. Нерушимые правила

| Правило                   | Смысл                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| wh-isolation              | Пока не объявлен cutover, `btw-wh-server` не правим «под balloons». Прод-срезы только там. |
| no-prod-deploy            | balloons не деплоим в прод на ранних фазах.                                                |
| no-mongo-collections      | На фазах 0–6 **не работаем с Mongo-коллекциями**. Persist = in-memory моки форм моделей.   |
| fixtures-first            | Парсинг и scrape-pipeline проверяются на **HTML fixture packs** конкурентов.               |
| one-api-two-fronts        | Один Node API-процесс (срезы+отчёты); два фронта: `web-slices`, `web-analytics`.           |
| ci-bar                    | `format:check` + `lint` + `test:run` + `build` на каждый PR; покрытие логики тестами.      |
| docs-with-code            | Модуль/API → сразу `docs/modules                                                           | api | frontend`. |
| no-real-telegram-in-tests | Уведомления только моки.                                                                   |

---

## 2. Целевая архитектура

### 2.1 Monorepo layout

```
balloons/
  apps/
    api/                 # Express: HTTP + job runtimes
    web-slices/          # Vite+React — ops срезов
    web-analytics/       # Vite+React — отчёты/графики
    extension/           # Chrome MV3 client-ingest
  packages/
    domain/              # типы, порты, sliceDate, -1, pack-flip detect, scrape profiles
    memory/              # InMemory* store + factories
    browser/             # HTML parsers + StockFetcher registry
    slice-engine/        # run/compensation/corrections/client-ingest
    reporting/           # rollup + aggregates + excel builders
  fixtures/
    pages/
      <konk>/
        manifest.json
        sku-page.html
        skugr-page.html
        ...
  docs/
    ROADMAP.md
    modules/
    api/
    frontend/
  .github/workflows/ci.yml
  .cursor/rules/
```

### 2.2 Порты (зависимости наружу)

```text
PageSource.getSkuPageHtml(konk, url) / getSkugrPageHtml(konk, url) -> html
CatalogStore  — Konk / Prod / Sku / Skugr (read + минимальный seed API для тестов)
SliceStore    — точки stock/price по (konk, productId, date) + day-meta
onSliceStockMutated({ konk, day, ... }) — хук после записи точек
```

Ранние адаптеры: `FixturePageSource`, `InMemoryCatalogStore`, `InMemorySliceStore`, in-process rollup handler.  
Позже: `HttpPageSource`, `Mongo*` — без смены engine.

### 2.3 Изоляция нагрузки в одном процессе

| Работа                                           | Где                                            |
| ------------------------------------------------ | ---------------------------------------------- |
| HTTP API                                         | main                                           |
| Slice jobs (scrape, compensation, batch-correct) | main, async I/O, отдельная очередь `sliceJobs` |
| Excel build                                      | `worker_threads`, очередь `excelJobs`          |
| JSON charts/sales                                | main; тяжёлый CPU → job                        |

Две очереди не блокируют друг друга на уровне планирования.

### 2.4 Улучшения относительно wh-server

- Stock dispatch в `browser`, не в каталоге SKU.
- Client-ingest **для всех konk** с первого дизайна API.
- Один модуль `sliceDate` с явными функциями под cron / compensation / client-open.
- Rollup через порт мутаций, не прямой import «отчётного» HTTP-модуля.
- Новый konk = config + parser + fixture pack (без копипасты runner).

Ориентир поведения (не копипаст структуры): домены sku-slices / slices / browser / slice-compensation / sku-stock-bands / sku-reporting / excel-jobs / apitasks в wh.

---

## 3. Fixture pack — общий формат

Путь: `fixtures/pages/<konk>/`.

### 3.1 `manifest.json` (контракт)

```json
{
  "konk": "air",
  "slots": [
    {
      "id": "sku-page",
      "file": "sku-page.html",
      "meta": { "url": "https://example/product/1", "productId": "P1" },
      "expected": { "stock": 10, "price": 99.5 }
    },
    {
      "id": "skugr-page",
      "file": "skugr-page.html",
      "meta": { "url": "https://example/group/1" },
      "expected": { "products": [{ "productId": "P1", "url": "..." }] }
    }
  ]
}
```

### 3.2 Обязательные слоты (минимум)

| Slot id      | Назначение                                          |
| ------------ | --------------------------------------------------- |
| `sku-page`   | Карточка → `{ stock, price }` (+ optional packSize) |
| `skugr-page` | Листинг группы → список product refs                |

### 3.3 Расширяемые слоты

`oos-page`, `waf-blocked-page`, `invalid-html-page`, `pack-variant-page`, …

### 3.4 Правила

- CI читает только фикстуры; live fetch в CI запрещён.
- `expected` — source of truth для golden-тестов парсера.
- Реальные HTML кладутся, когда готовы наборы «в одном формате на конкурента».

---

## 4. Стек и CI

**API / packages:** Node `>=26`, TypeScript strict, Express 5, Zod, Vitest, Prettier, ESLint.  
**Front:** Vite + React + TS + TanStack Query.  
**Scripts (root):** `ci` = `format:check && lint && test:run && build`.  
**CI:** GitHub Actions, Node 26, `npm ci` → `npm run ci`.  
**Rules:** `.cursor/rules` — модульность, docs, dto, tests, telegram mocks.

---

## 5. Фазы разработки

Не прыгать через фазу; у каждой фазы есть **DoD**; чекбоксы обновлять здесь при завершении.

### Phase 0 — Scaffold репозитория

**Цель:** пустой каркас, зелёный CI, без доменной логики.

**Сделать:**

- [x] npm workspaces (`apps/*`, `packages/*`)
- [x] TS / ESLint / Prettier / Vitest root
- [x] `apps/api` health `GET /health` → 200
- [x] `.github/workflows/ci.yml`
- [x] `.cursor/rules/` (project, docs, dto, tests, telegram, general)
- [x] `docs/ROADMAP.md` (этот документ)
- [x] README: как поднять локально, что balloons ≠ wh

**DoD:** `npm run ci` зелёный; wh-server не изменён.

**Не делать:** Mongo, парсеры, фронты, cron.

---

### Phase 1 — Domain + ports + memory + fixture schema

**Цель:** контракты данных и тестовый контур без парсеров конкурентов.

**Сделать:**

- [x] `packages/domain`: типы `Sku`, `Skugr`, `Konk`, `Prod`, slice point `{ stock, price }`, day-meta, stock-band
- [x] Порты: `CatalogStore`, `SliceStore`, `PageSource`, `onSliceStockMutated`
- [x] `sliceDate` API с именованными сценариями (open/next/compensation)
- [x] Семантика `-1`, helpers invalid
- [x] `packages/memory`: in-memory stores + factories
- [x] Zod/JSON schema для `fixtures/pages/<konk>/manifest.json`
- [x] Dummy pack `fixtures/pages/_sample/` для проверки загрузчика
- [x] Тесты memory + schema + sliceDate
- [x] `docs/modules/domain.md`, `docs/modules/fixtures.md`

**DoD:** in-memory мир SKU/групп/точек в тестах; манифест валидируется; Mongo нет.

---

### Phase 2 — Browser parsers (fixture-driven)

**Цель:** из HTML слота достаём stock/price (и listing), konk за konk.

**Сделать:**

- [x] Интерфейс `parseSkuPage(html, ctx) → { stock, price, ... }`
- [x] Интерфейс `parseSkugrPage(html, ctx) → products[]`
- [x] Registry по `konk`
- [x] `FixturePageSource` читает pack с диска
- [ ] Подключение реальных packs по мере поставки
- [x] Golden tests: `expected` ↔ parser
- [x] Порт сложной логики из wh осознанно (не слепой copy)
- [x] `docs/modules/browser.md`

**DoD:** для каждого поставленного konk зелёные golden-тесты на `sku-page` (и `skugr-page`, если слот есть). Live HTTP выключен.

**Блокер:** HTML-наборы конкурентов. До них — только `_sample` / синтетика.

---

### Phase 3 — Slice engine на моках

**Цель:** полный контур среза/коррекций/client-ingest без HTTP UI и без Mongo.

**Сделать:**

- [x] `runSliceForKonk({ konk, day })`: catalog → urls → PageSource → parser → SliceStore
- [x] Skip already-valid; write `-1` на soft-fail; abort policy из config
- [x] Throttle profiles (можно no-op delay в тестах)
- [x] Day-meta stats
- [x] Compensation runner
- [x] Pack-flip detect + preview/apply
- [x] Band-spike discover + RTL correct; stock-bands CRUD in-memory + batch-correct
- [x] Client-ingest: `listPending` + `ingestHtml` — **generic**, не только air
- [x] `sliceJobs` очередь (create/poll/cancel) in-process
- [x] Хук `onSliceStockMutated`
- [x] Тесты + `docs/modules/slice-engine.md`

**DoD:** сценарий «прогон дня по фикстурам → точки → pending/PUT → pack-flip/band preview» покрыт тестами.

---

### Phase 4 — Reporting

**Цель:** продажи/агрегаты/Excel на memory срезах.

**Сделать:**

- [ ] Materialize manufacturer day sales
- [ ] Wire `onSliceStockMutated` → materialize (+ coalesce для батч-ingest)
- [ ] JSON aggregates (контракты близки к wh API)
- [ ] Excel builders + `excelJobs` + `worker_threads`
- [ ] Тесты + `docs/modules/reporting.md`

**DoD:** rollup сходится с ручным расчётом; Excel job в worker; sliceJobs планируются независимо.

---

### Phase 5 — HTTP API + два фронта + extension

**Цель:** человеком управляемый продукт локально.

**Сделать:**

- [ ] `apps/api`: auth (JWT + in-memory users), routers slices/reports/excel-jobs/browser-debug
- [ ] CORS под два origin фронтов
- [ ] `apps/web-slices`
- [ ] `apps/web-analytics`
- [ ] `apps/extension` MV3
- [ ] `docs/api/*`, `docs/frontend/*`
- [ ] API integration smoke (supertest)

**DoD:** локально api + оба web; прогон среза виден в UI.

---

### Phase 6 — Optional live PageSource

**Цель:** иногда бить в реальные URL локально; CI на фикстурах.

**Сделать:**

- [ ] `HttpPageSource`
- [ ] Feature flag `PAGE_SOURCE=fixture|http`
- [ ] Запрет http в CI / `NODE_ENV=test`
- [ ] Документация рисков (WAF, rate limit)

**DoD:** руками можно прогнать 1 SKU live; CI не ходит в сеть. Mongo/прод-деплой всё ещё нет.

---

### Phase 7 — Persistence + cutover (отдельный этап)

Набросок; детализация в `docs/CUTOVER.md`, когда дойдём:

- [ ] Mongo adapters к тем же портам
- [ ] shared DB vs staging DB
- [ ] Cutover writer flag; один writer months
- [ ] `docs/CUTOVER.md`

---

## 6. Карта функционала wh → balloons

| Область wh                          | Фаза balloons          |
| ----------------------------------- | ---------------------- |
| slices config/utils                 | 1–3                    |
| browser parsers / stock             | 2–3                    |
| sku-slices cron/run/day-meta/months | 3 (memory)             |
| slice-compensation                  | 3                      |
| sku-stock-bands + band-spike        | 3                      |
| client air ingest → generic         | 3 + 5                  |
| apitasks slice kinds                | 3 + 5 (`sliceJobs`)    |
| sku-reporting rollup                | 4                      |
| sku-sales/chart reports             | 4–5                    |
| excel-jobs (sku kinds only)         | 4–5                    |
| btrade-slices                       | после 5 (backlog)      |
| skugrs fill / grabo sync            | backlog                |
| warehouse excel/apitasks            | **никогда** в balloons |

---

## 7. Backlog (после MVP фаз 0–5)

- [ ] Btrade / sharik `product_rests` pipeline
- [ ] Rotation buckets per konk
- [ ] TG notifications (мок → optional live)
- [ ] Skugr fill client channel
- [ ] Multi-instance job lease

---

## 8. Порядок движения

1. Этот ROADMAP лежит в `docs/ROADMAP.md`.
2. Отдельной сессией в воркспейсе balloons: **только Phase 0**.
3. Phase 1.
4. HTML packs → Phase 2 по konk.
5. Phase 3 → 4 → 5.
6. Phase 6 по желанию.
7. Phase 7 — отдельное решение.

Чекбоксы здесь — статус прогресса. Новые идеи → Backlog или правка фазы **до** старта работ по ней.
