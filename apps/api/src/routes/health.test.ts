import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../test/createTestApp.js';

describe('GET /health', () => {
  it('returns 200 and { ok: true } without auth', async () => {
    const { app } = await createTestApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
