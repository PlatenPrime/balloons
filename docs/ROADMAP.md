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

**Cutover gate:** переключение writer/прод с `btw-wh-server` на balloons **запрещено**, пока локально не закрыт DoD Phase 5 — один API + `web-slices` + `web-analytics` + extension. Phase 6 (live PageSource) опциональна и cutover **не** разблокирует.

---

## 1. Нерушимые правила

| Правило                   | Смысл                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| wh-isolation              | Пока не объявлен cutover, `btw-wh-server` не правим «под balloons». Прод-срезы только там.          |
| no-prod-deploy            | balloons не деплоим в прод на ранних фазах.                                                         |
| no-mongo-collections      | На фазах 0–6 **не работаем с Mongo-коллекциями**. Persist = in-memory моки форм моделей.            |
| fixtures-first            | Парсинг и scrape-pipeline проверяются на **HTML fixture packs** конкурентов.                        |
| one-api-two-fronts        | Один Node API-процесс (срезы+отчёты); два фронта: `web-slices`, `web-analytics`.                    |
| three-part-before-cutover | Phase 7 (cutover) стартует только после DoD Phase 5: api + оба web + extension.                     |
| ci-bar                    | `format:check` + `lint` + `typecheck` + `test:run` + `build` на каждый PR; покрытие логики тестами. |
| docs-with-code            | Модуль/API/frontend → сразу `docs/modules` / `docs/api` / `docs/frontend`.                          |
| no-real-telegram-in-tests | Уведомления только моки.                                                                            |

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
    web-api-client/      # typed fetch + Zod DTO (оба фронта; extension по необходимости)
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
- Два отдельных Vite-фронта вместо одного SPA со складом; общий только тонкий `web-api-client`.

Ориентир поведения (не копипаст структуры): домены sku-slices / slices / browser / slice-compensation / sku-stock-bands / sku-reporting / excel-jobs / apitasks в wh; CI-экраны `btw-wh/web` → пересборка в `web-slices` / `web-analytics`.

### 2.5 Frontend surface

Инвентарь экранов до cutover = CI-паритет с `btw-wh` **без** склада / grabo / btrade / sharik. Comparison = **peer konk only** (konk↔konk / selected SKUs), never vs btrade/sharik. Детали маршрутов — в `docs/frontend/*`.

#### `apps/web-slices` (ops)

| Область                         | Назначение                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Auth                            | Login; JWT; in-memory users на Phase 5                                         |
| Catalog                         | Konks / skugrs / competitor-skus (+ detail); CRUD здесь, не в analytics        |
| Day slices                      | Статус дня, invalid points, запуск/poll `sliceJobs`                            |
| Corrections                     | Compensation, post-corrections (через `sliceJobs`, без отдельного wh ApiTasks) |
| Pack-flips / band-spike / bands | Discover → preview/apply; stock-bands CRUD + batch-correct                     |
| Client-ingest                   | Panel на konk (generic); bridge с extension                                    |

Исключить из MVP и навсегда: warehouse, btrade/sharik baseline, grabo. `yumi` deprecated — не портировать.

#### `apps/web-analytics` (reports)

| Область         | Назначение                                                   |
| --------------- | ------------------------------------------------------------ |
| Sales / stock   | Time series по konk+prod[+skugr]                             |
| Statistics      | Manufacturer pie/stats + drill prod/skugr                    |
| Comparison      | Across konks для prod; selected SKUs                         |
| Excel           | Order / list / download только CI kinds                      |
| Catalog filters | Read-only справочники через API (CRUD остаётся в web-slices) |

#### `apps/extension`

Chrome MV3: capture HTML → balloons API (generic konk), JWT/bridge из web-slices.

**Паттерн UI (ориентир, не догма):** Fetcher → Container → View; URL-driven filters; async jobs с poll/toast. UI-примитивы (Tailwind + Radix/shadcn-подобные) живут **внутри каждого app**; общего UI-kit на старте нет.

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
      "expected": { "stock": 10, "price": 99.5, "artikul": "A1" }
    },
    {
      "id": "skugr-page",
      "file": "skugr-page.html",
      "meta": { "url": "https://example/group/1" },
      "expected": { "products": [{ "productId": "P1", "url": "...", "title": "..." }] }
    }
  ]
}
```

Cart/AJAX konk may set `meta.responses` → companion JSON under the pack.

### 3.2 Обязательные слоты (минимум)

| Slot id      | Назначение                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| `sku-page`   | Карточка → `{ stock, price, artikul?, title?, productId?, packSize? }`     |
| `skugr-page` | Листинг группы → список product refs (`productId`, optional `url`/`title`) |

### 3.3 Расширяемые слоты

`oos-page`, `waf-blocked-page`, `invalid-html-page`, `pack-variant-page`, …

### 3.4 Правила

- CI читает только фикстуры; live fetch в CI запрещён.
- `expected` — source of truth для golden-тестов парсера.
- Реальные HTML кладутся, когда готовы наборы «в одном формате на конкурента».

---

## 4. Стек и CI

**API / packages:** Node `>=26`, TypeScript strict, Express 5, Zod, Vitest, Prettier, ESLint.  
**Front:** Vite + React + TS + TanStack Query + React Router + Zod + react-hook-form; Tailwind + Radix/shadcn-подобные примитивы per-app.  
**Shared front:** `packages/web-api-client` — typed fetch + Zod DTO для обоих фронтов (и extension при необходимости).  
**Scripts (root):** `ci` = `format:check && lint && typecheck && test:run && build`; `typecheck` = editor `tsconfig.json` (src+tests); `build` = `tsconfig.build.json` (emit, без тестов); `dev:api`, `dev:web-slices`, `dev:web-analytics`.  
**CI:** GitHub Actions, Node 26, `npm ci` → `npm run ci`.  
**Rules:** `.cursor/rules` — модульность, docs, dto, tests, telegram mocks.

---

## 5. Фазы разработки

Не прыгать через фазу; у каждой фазы есть **DoD**; чекбоксы обновлять здесь при завершении.  
Подфазы Phase 5 (5.0 → 5.4) тоже строго по порядку.

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
- [x] Подключение реальных packs: `air`, `balun`, `dojdevik`, `yumin`, `sharte`, `perfect`, `svbum`, `partymall` (+ `_sample`)
- [x] `fetchKonkPageData({ konk, url, type })` + FixtureTransport / StageError black-box stages
- [x] Golden tests: `expected` ↔ `fetchKonkPageData` / parsers
- [x] Порт сложной логики из wh осознанно (не слепой copy)
- [x] `docs/modules/browser.md`

**DoD:** для каждого поставленного konk зелёные golden-тесты на `sku-page` (и `skugr-page`, если слот есть). Live HTTP выключен.

**Rejected в packs:** `yumi` (deprecated), `sharik` / btrade baseline.

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

- [x] Materialize manufacturer day sales
- [x] Wire `onSliceStockMutated` → materialize (+ coalesce для батч-ingest)
- [x] JSON aggregates (контракты близки к wh API)
- [x] Excel builders + `excelJobs` + `worker_threads`
- [x] Тесты + `docs/modules/reporting.md`

**DoD:** rollup сходится с ручным расчётом; Excel job в worker; sliceJobs планируются независимо.

**Блокер для Phase 5.0 reports/excel и 5.3:** без закрытых Phase 4 **и** Phase 4.1 analytics-фронт и report-роуты не начинать.

---

### Phase 4.1 — Reporting test gap (corrective)

**Цель:** довести покрытие `@balloons/reporting` до паритета с публичной поверхностью Phase 4. Новый product-код не писать — только тесты.

**Сделать:**

- [x] `salesMath` + coalesce read-path: null gaps в sequence; delivery; `computePersistedDaySales` + `recountDays`; `coalesceSlicePointsAlongDates` (`-1`/дыры не обновляют carry)
- [x] materialize: multi-SKU → multi-prod buckets; empty day → `replaceDay([])`; `materializeManufacturerDaySalesDateRange`
- [x] schedule coalesce: trailing dirty re-run (re-schedule while `running`); `flushScheduledMaterialize` до idle
- [x] JSON aggregates: sku by-date/range, skugr daily/skus-sales, konk-prod groups, stock series, sales series with `skugrIds`, manufacturers-pie, prod-konks-pie + `excludeKonks`, selection pie (skuIds + selectAll); miss/empty resolve → null/empty где контракт требует
- [x] excel: ≥3 kinds сверх `sku-one-sales` (`sku-konk-sales`, `sku-skugr-stock`, `sku-selection-sales`); ExcelJS sheet/content smoke
- [x] `excelJobs`: cancel queued/running; failed build → `failed`; `getFile` only when `ready`
- [x] worker: один тест через `createExcelJobQueue({ workerUrl → dist/.../excelJobWorker.js })` после `tsc` (не eval Worker)

**DoD:** перечисленные ветки зелёные в `test:run`; Phase 5.0 не стартовать до закрытия 4.1.

**Блокер:** Phase 5.0 (reports/excel routers) и 5.3 — только после DoD Phase 4.1.

---

### Phase 5 — HTTP API + два фронта + extension

**Цель:** человеком управляемый **трёхсоставной** продукт локально (api + web-slices + web-analytics; extension для ingest).  
Не прыгать через подфазы 5.0 → 5.4. Общий DoD Phase 5 = сумма DoD подфаз.

Ориентир UX: CI-поверхность `btw-wh/web` (пересборка, не копипаст). Документы: `docs/api/*`, `docs/frontend/*`.

#### Phase 5.0 — API surface

**Precondition:** DoD Phase 4 + Phase 4.1 (reporting test gap).

**Цель:** HTTP над memory/engine/reporting; CORS под два origin.

**Сделать:**

- [x] JWT auth + in-memory users
- [x] CORS под origins `web-slices` и `web-analytics`
- [x] Routers: catalog, slices (day/run/corrections/ingest), sliceJobs, stock-bands / pack-flips / band-spike, reports, excel-jobs, browser-debug
- [x] `packages/web-api-client` (typed client + Zod DTO)
- [x] API integration smoke (supertest)
- [x] `docs/api/*`

**DoD:** smoke по ключевым роутам на memory; оба фронт-origin в CORS; Mongo нет.

#### Phase 5.1 — web-slices scaffold

**Цель:** каркас ops-приложения.

**Сделать:**

- [ ] Vite + React + TS + TanStack Query + React Router в `apps/web-slices`
- [ ] Auth (login) + shell/nav
- [ ] Подключение `web-api-client`
- [ ] Root scripts `dev:web-slices`; app в `build` / CI
- [ ] `docs/frontend/web-slices.md` (маршруты scaffold)

**DoD:** локально login + stub catalog/health page против api.

#### Phase 5.2 — web-slices ops

**Цель:** полный ops-контур срезов в UI.

**Сделать:**

- [ ] Catalog: konks / skugrs / competitor-skus (+ detail)
- [ ] Day slices status + invalid points; create/poll/cancel `sliceJobs`
- [ ] Compensation + post-corrections
- [ ] Pack-flips, band-spike, stock-bands (+ discover/batch-correct)
- [ ] Client-ingest panel на konk (generic)
- [ ] Обновить `docs/frontend/web-slices.md`

**DoD:** прогон дня по фикстурам виден в UI (статус дня / точки / jobs).

#### Phase 5.3 — web-analytics scaffold + reports

**Цель:** второй фронт; отчёты на memory данных (после Phase 4 + 4.1 + 5.0).

**Сделать:**

- [ ] Vite scaffold `apps/web-analytics` (тот же стек; свой shell)
- [ ] Sales / stock time series
- [ ] Statistics (+ prod/skugr drill)
- [ ] Comparison (konks / selected skus)
- [ ] Excel order / list / download (CI kinds only)
- [ ] Root scripts `dev:web-analytics`; app в `build` / CI
- [ ] `docs/frontend/web-analytics.md`

**DoD:** отчёт (хотя бы sales + один excel kind) открывается на memory данных против того же api.

#### Phase 5.4 — extension

**Цель:** MV3 client-ingest, generic по konk.

**Сделать:**

- [ ] `apps/extension` MV3
- [ ] Bridge с JWT / session из web-slices
- [ ] Capture HTML → pending/ingest API
- [ ] `docs/frontend/extension.md`

**DoD:** capture → pending/ingest через api; UI pending в web-slices обновляется.

**DoD Phase 5 (итог):** локально подняты api + оба web; прогон среза и базовый отчёт видны в UI; extension закрывает ingest-контур. Только после этого допустим старт Phase 7.

---

### Phase 6 — Optional live PageSource

**Цель:** иногда бить в реальные URL локально; CI на фикстурах.

**Сделать:**

- [ ] `HttpPageSource`
- [ ] Feature flag `PAGE_SOURCE=fixture|http`
- [ ] Запрет http в CI / `NODE_ENV=test`
- [ ] Документация рисков (WAF, rate limit)

**DoD:** руками можно прогнать 1 SKU live; CI не ходит в сеть. Mongo/прод-деплой всё ещё нет.

**Не разблокирует cutover:** Phase 6 можно пропустить или сделать после/параллельно подготовке Phase 7, но **не вместо** Phase 5.

---

### Phase 7 — Persistence + cutover (отдельный этап)

**Precondition:** DoD Phase 5 закрыт (api + `web-slices` + `web-analytics` + extension). Без трёхсоставного локального MVP cutover не начинать.

Детализация в `docs/CUTOVER.md`, когда дойдём:

- [ ] Mongo adapters к тем же портам
- [ ] shared DB vs staging DB
- [ ] Cutover writer flag; один writer months
- [ ] `docs/CUTOVER.md`

---

## 6. Карта функционала wh → balloons

| Область wh                           | Фаза balloons                  |
| ------------------------------------ | ------------------------------ |
| slices config/utils                  | 1–3                            |
| browser parsers / stock              | 2–3                            |
| sku-slices cron/run/day-meta/months  | 3 (memory) + 5.0/5.2 (HTTP/UI) |
| slice-compensation                   | 3 + 5.2                        |
| sku-stock-bands + band-spike         | 3 + 5.2                        |
| client air ingest → generic          | 3 + 5.0/5.2/5.4                |
| apitasks slice kinds                 | 3 + 5.0/5.2 (`sliceJobs`)      |
| sku-reporting rollup                 | 4 + 4.1 (test gap)             |
| sku-sales/chart reports              | 4 + 4.1 + 5.0/5.3              |
| excel-jobs (sku kinds only)          | 4 + 4.1 + 5.0/5.3              |
| btrade-slices / sharik product_rests | **rejected** — peer konk only  |
| skugrs fill / grabo sync             | backlog                        |
| warehouse excel/apitasks             | **никогда** в balloons         |

---

## 7. Backlog (после MVP фаз 0–5)

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
5. Phase 3 → 4 → **4.1** → **5.0 → 5.1 → 5.2 → 5.3 → 5.4**.
6. Phase 6 по желанию (не gate для cutover).
7. Phase 7 — **только** после DoD Phase 5 (трёхсоставной MVP); отдельное решение + `docs/CUTOVER.md`.

Чекбоксы здесь — статус прогресса. Новые идеи → Backlog или правка фазы **до** старта работ по ней.
