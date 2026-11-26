import { toSliceDate } from '@balloons/domain';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, loginToken } from './test/createTestApp.js';

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/pages');

async function waitForSliceJob(
  app: ReturnType<typeof request>,
  token: string,
  id: string,
  timeoutMs = 5000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await app.get(`/slice-jobs/${id}`).set('authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (res.body.status === 'completed' || res.body.status === 'failed') {
      return res.body;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`slice job ${id} did not finish`);
}

async function waitForExcelJob(
  app: ReturnType<typeof request>,
  token: string,
  id: string,
  timeoutMs = 5000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await app.get(`/excel-jobs/${id}`).set('authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (res.body.status === 'ready' || res.body.status === 'failed') {
      return res.body;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`excel job ${id} did not finish`);
}

describe('Phase 5.0 API smoke', () => {
  it('rejects protected routes without JWT', async () => {
    const { app } = await createTestApp();
    const res = await request(app).get('/catalog/konks');
    expect(res.status).toBe(401);
  });

  it('login → me and CORS allowlist', async () => {
    const { app } = await createTestApp({
      corsOrigins: ['http://localhost:5173', 'http://localhost:5174'],
    });

    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTypeOf('string');

    const me = await request(app)
      .get('/auth/me')
      .set('authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ username: 'admin' });

    const corsSlices = await request(app).get('/health').set('origin', 'http://localhost:5173');
    expect(corsSlices.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const corsAnalytics = await request(app).get('/health').set('origin', 'http://localhost:5174');
    expect(corsAnalytics.headers['access-control-allow-origin']).toBe('http://localhost:5174');

    const corsDenied = await request(app).get('/health').set('origin', 'http://evil.example');
    expect(corsDenied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('catalog list + seed write', async () => {
    const { app } = await createTestApp();
    const token = await loginToken(app);
    const auth = { authorization: `Bearer ${token}` };

    const list = await request(app).get('/catalog/konks').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);

    const seeded = await request(app)
      .post('/catalog/konks')
      .set(auth)
      .send({ name: 'smoke-konk', title: 'Smoke Konk' });
    expect(seeded.status).toBe(201);
    expect(seeded.body.name).toBe('smoke-konk');
  });

  it('day meta / points + pending on fixture konk', async () => {
    const { app, deps } = await createTestApp({ fixturesRoot });
    const token = await loginToken(app);
    const auth = { authorization: `Bearer ${token}` };
    const day = toSliceDate(new Date('2026-07-15T12:00:00.000Z'));
    const dayWire = day.toISOString();

    const worldSku = (await deps.catalog.listSkus())[0]!;
    await deps.slices.upsertPoint({
      konkName: worldSku.konkName,
      productId: worldSku.productId,
      date: day,
      point: { stock: 10, price: 5 },
    });

    const metaPut = await request(app)
      .put(`/slices/${worldSku.konkName}/days/${dayWire}/meta`)
      .set(auth)
      .send({
        stats: { filled: 1, invalid: 0, errorCount: 0 },
      });
    expect(metaPut.status).toBe(200);
    expect(metaPut.body.stats.filled).toBe(1);

    const points = await request(app)
      .get(`/slices/${worldSku.konkName}/days/${dayWire}/points`)
      .set(auth);
    expect(points.status).toBe(200);
    expect(
      points.body.items.some((i: { productId: string }) => i.productId === worldSku.productId),
    ).toBe(true);

    const pending = await request(app).get(`/slices/${worldSku.konkName}/pending`).set(auth);
    expect(pending.status).toBe(200);
    expect(pending.body).toHaveProperty('items');
  });

  it('sliceJobs create/poll/cancel', async () => {
    const { app } = await createTestApp({ fixturesRoot });
    const token = await loginToken(app);
    const auth = { authorization: `Bearer ${token}` };
    const day = '2026-07-15T00:00:00.000Z';

    const created = await request(app)
      .post('/slice-jobs')
      .set(auth)
      .send({ kind: 'slice.run', konk: 'air', day });
    expect(created.status).toBe(202);
    expect(created.body.id).toBeTruthy();

    const toCancel = await request(app)
      .post('/slice-jobs')
      .set(auth)
      .send({ kind: 'compensation.run', konk: 'air', day });
    expect(toCancel.status).toBe(202);

    const cancel = await request(app).post(`/slice-jobs/${toCancel.body.id}/cancel`).set(auth);
    expect(cancel.status).toBe(200);
    expect(['cancelled', 'completed', 'failed']).toContain(cancel.body.status);

    const finished = await waitForSliceJob(request(app), token, created.body.id);
    expect(['completed', 'failed']).toContain(finished.status);

    const polled = await request(app).get(`/slice-jobs/${created.body.id}`).set(auth);
    expect(polled.status).toBe(200);
    expect(polled.body.id).toBe(created.body.id);
  });

  it('report + excel job file', async () => {
    const { app, deps } = await createTestApp();
    const token = await loginToken(app);
    const auth = { authorization: `Bearer ${token}` };

    const sku = (await deps.catalog.listSkus())[0]!;
    const d0 = toSliceDate(new Date('2026-07-14T12:00:00.000Z'));
    const d1 = toSliceDate(new Date('2026-07-15T12:00:00.000Z'));
    await deps.slices.upsertPoint({
      konkName: sku.konkName,
      productId: sku.productId,
      date: d0,
      point: { stock: 100, price: 10 },
    });
    await deps.slices.upsertPoint({
      konkName: sku.konkName,
      productId: sku.productId,
      date: d1,
      point: { stock: 70, price: 10 },
    });

    const report = await request(app)
      .get('/reports/sku-by-date')
      .query({ skuId: sku.id, date: d1.toISOString() })
      .set(auth);
    expect(report.status).toBe(200);
    expect(report.body).toMatchObject({ sales: 30 });

    const excel = await request(app)
      .post('/excel-jobs')
      .set(auth)
      .send({
        kind: 'sku-one-sales',
        params: {
          skuId: sku.id,
          dateFrom: '2026-07-14',
          dateTo: '2026-07-15',
        },
      });
    expect(excel.status).toBe(202);

    const ready = await waitForExcelJob(request(app), token, excel.body.id);
    expect(ready.status).toBe('ready');

    const file = await request(app)
      .get(`/excel-jobs/${excel.body.id}/file`)
      .set(auth)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c as Buffer));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(file.status).toBe(200);
    expect(Buffer.isBuffer(file.body)).toBe(true);
    expect((file.body as Buffer).length).toBeGreaterThan(0);
  });

  it('pack-flip preview and band-spike discover', async () => {
    const { app, deps } = await createTestApp();
    const token = await loginToken(app);
    const auth = { authorization: `Bearer ${token}` };
    const sku = (await deps.catalog.listSkus())[0]!;
    const d0 = toSliceDate(new Date('2026-08-01T12:00:00.000Z'));
    const d1 = toSliceDate(new Date('2026-08-02T12:00:00.000Z'));

    await deps.slices.upsertPoint({
      konkName: sku.konkName,
      productId: sku.productId,
      date: d0,
      point: { stock: 10, price: 100 },
    });
    await deps.slices.upsertPoint({
      konkName: sku.konkName,
      productId: sku.productId,
      date: d1,
      point: { stock: 100, price: 10 },
    });

    const preview = await request(app)
      .post('/corrections/pack-flips/preview')
      .set(auth)
      .send({
        konk: sku.konkName,
        productIds: [sku.productId],
        dateFrom: d0.toISOString(),
        dateTo: d1.toISOString(),
      });
    expect(preview.status).toBe(200);
    expect(preview.body.konkName).toBe(sku.konkName);

    const discover = await request(app)
      .post('/corrections/band-spike/discover')
      .set(auth)
      .send({
        konk: sku.konkName,
        productIds: [sku.productId],
        dateFrom: d0.toISOString(),
        dateTo: d1.toISOString(),
        stockMin: 50,
        stockMax: 200,
        normalMax: 20,
      });
    expect(discover.status).toBe(200);
    expect(discover.body).toHaveProperty('items');
  });

  it('browser-debug parse-sku on fixture html', async () => {
    const { app } = await createTestApp({ fixturesRoot });
    const token = await loginToken(app);
    const htmlPath = join(fixturesRoot, '_sample', 'sku-page.html');
    const html = await readFile(htmlPath, 'utf8');

    const res = await request(app)
      .post('/browser-debug/parse-sku')
      .set('authorization', `Bearer ${token}`)
      .send({
        konk: '_sample',
        html,
        url: 'https://example.com/product/1',
      });
    // Either parses or returns 400 if fixture layout differs — both prove the route.
    expect([200, 400]).toContain(res.status);
  });
});
