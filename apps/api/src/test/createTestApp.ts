import type { Express } from 'express';
import { createApp } from '../app.js';
import { createAppDeps, type CreateAppDepsOptions } from '../composition.js';
import type { AppDeps } from '../deps.js';

export async function createTestApp(options: CreateAppDepsOptions = {}): Promise<{
  app: Express;
  deps: AppDeps;
}> {
  const deps = await createAppDeps({
    useInProcessExcelBuild: true,
    ...options,
  });
  return { app: createApp(deps), deps };
}

export async function loginToken(
  app: Express,
  username = 'admin',
  password = 'admin',
): Promise<string> {
  const request = (await import('supertest')).default;
  const res = await request(app).post('/auth/login').send({ username, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}
