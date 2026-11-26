import cors from 'cors';
import express from 'express';
import type { AppDeps } from './deps.js';
import { errorMiddleware } from './http/errors.js';
import { createRequireAuth } from './http/requireAuth.js';
import { createAuthedAuthRouter, createPublicAuthRouter } from './routes/auth.js';
import { createBrowserDebugRouter } from './routes/browserDebug.js';
import { createCatalogRouter } from './routes/catalog.js';
import { createCorrectionsRouter } from './routes/corrections.js';
import { createExcelJobsRouter } from './routes/excelJobs.js';
import { healthRouter } from './routes/health.js';
import { createReportsRouter } from './routes/reports.js';
import { createSliceJobsRouter } from './routes/sliceJobs.js';
import { createSlicesRouter } from './routes/slices.js';

export function createApp(deps: AppDeps) {
  const app = express();
  app.use(
    cors({
      origin: deps.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '5mb' }));

  app.use(healthRouter);
  app.use(createPublicAuthRouter(deps));

  app.use(createRequireAuth(deps.auth));
  app.use(createAuthedAuthRouter());
  app.use(createCatalogRouter(deps));
  app.use(createSlicesRouter(deps));
  app.use(createSliceJobsRouter(deps));
  app.use(createCorrectionsRouter(deps));
  app.use(createReportsRouter(deps));
  app.use(createExcelJobsRouter(deps));
  app.use(createBrowserDebugRouter());

  app.use(errorMiddleware);
  return app;
}
