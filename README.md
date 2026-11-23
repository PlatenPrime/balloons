# balloons

Competitive intelligence product: competitor stock/price **slices**, reports, and ops/analytics UIs.

This is **not** the warehouse. Inventory and warehouse APIs stay in `btw-wh-server`. Early phases of balloons are a sandbox (no prod deploy, no Mongo collections).

See [docs/ROADMAP.md](docs/ROADMAP.md) for phases and architecture.

## Requirements

- Node.js `>=26`
- npm (workspaces)

## Setup

```bash
npm install
```

## Scripts

| Script             | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `npm run ci`       | format:check + lint + test:run + build       |
| `npm run dev:api`  | API with reload (`GET /health` on port 3000) |
| `npm run build`    | Build workspace packages that define `build` |
| `npm run test:run` | Vitest once                                  |

## Local API

```bash
npm run dev:api
```

Then: `GET http://localhost:3000/health` → `200` `{ "ok": true }`.

Override port with `PORT`.

## Layout (high level)

```
apps/api          Express API (Phase 0: health only)
packages/domain   types, ports, sliceDate, -1, fixture schema
packages/memory   InMemory* stores + seed factories
fixtures/pages    HTML fixture packs per competitor (`_sample` dummy)
docs/             ROADMAP + module docs
```
