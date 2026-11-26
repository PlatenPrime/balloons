import { createFixturePageSource } from '@balloons/browser';
import type { CatalogStore, ManufacturerDaySalesStore, SliceStore } from '@balloons/domain';
import {
  createInMemoryCatalogStore,
  createInMemoryManufacturerDaySalesStore,
  createInMemorySliceStore,
  createSeededWorld,
} from '@balloons/memory';
import {
  createExcelJobQueue,
  createMaterializeOnSliceStockMutated,
  type MaterializeDeps,
} from '@balloons/reporting';
import { createSliceJobQueue, noOpDelay } from '@balloons/slice-engine';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuthService } from './auth/authService.js';
import type { AppDeps } from './deps.js';

const defaultFixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/pages',
);

export type CreateAppDepsOptions = {
  fixturesRoot?: string;
  jwtSecret?: string;
  username?: string;
  password?: string;
  corsOrigins?: string[];
  /** Use seeded sample world (tests / local sandbox). Default true. */
  seedWorld?: boolean;
  useInProcessExcelBuild?: boolean;
};

export async function createAppDeps(options: CreateAppDepsOptions = {}): Promise<AppDeps> {
  const fixturesRoot = options.fixturesRoot ?? defaultFixturesRoot;
  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET ?? 'balloons-dev-secret';
  const username = options.username ?? process.env.AUTH_USERNAME ?? 'admin';
  const password = options.password ?? process.env.AUTH_PASSWORD ?? 'admin';
  const corsOrigins = options.corsOrigins ?? [
    process.env.WEB_SLICES_ORIGIN ?? 'http://localhost:5173',
    process.env.WEB_ANALYTICS_ORIGIN ?? 'http://localhost:5174',
  ];
  const useInProcessExcelBuild = options.useInProcessExcelBuild ?? true;

  const materializeDeps: MaterializeDeps = {
    catalog: undefined as unknown as CatalogStore,
    slices: undefined as unknown as SliceStore,
    sales: undefined as unknown as ManufacturerDaySalesStore,
  };
  const onSliceStockMutated = createMaterializeOnSliceStockMutated(materializeDeps);

  if (options.seedWorld !== false) {
    const world = await createSeededWorld({
      sliceStoreOptions: { onSliceStockMutated },
    });
    materializeDeps.catalog = world.catalog;
    materializeDeps.slices = world.slices;
    materializeDeps.sales = world.sales;
  } else {
    materializeDeps.catalog = createInMemoryCatalogStore();
    materializeDeps.sales = createInMemoryManufacturerDaySalesStore();
    materializeDeps.slices = createInMemorySliceStore({ onSliceStockMutated });
  }

  const { catalog, slices, sales } = materializeDeps;
  const pageSource = createFixturePageSource({ fixturesRoot });
  const sliceJobs = createSliceJobQueue({
    catalog,
    slices,
    pageSource,
    delay: noOpDelay,
  });
  const excelJobs = createExcelJobQueue({
    catalog,
    slices,
    ...(useInProcessExcelBuild ? { useInProcessBuild: true } : {}),
  });

  return {
    catalog,
    slices,
    sales,
    pageSource,
    sliceJobs,
    excelJobs,
    auth: createAuthService({
      users: [{ username, password }],
      jwtSecret,
    }),
    corsOrigins,
  };
}
