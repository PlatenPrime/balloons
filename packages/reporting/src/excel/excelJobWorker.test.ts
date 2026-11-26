import { createSeededWorld } from '@balloons/memory';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { createExcelJobQueue } from './excelJobs.js';

const execFileAsync = promisify(execFile);
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const domainRoot = join(pkgRoot, '../domain');
const workerDist = join(pkgRoot, 'dist/excel/excelJobWorker.js');
const requireFromPkg = createRequire(join(pkgRoot, 'package.json'));
const tscBin = requireFromPkg.resolve('typescript/bin/tsc');

async function runTsc(cwd: string): Promise<void> {
  try {
    await execFileAsync(process.execPath, [tscBin, '-p', 'tsconfig.build.json'], {
      cwd,
      env: process.env,
    });
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const stdout = e.stdout?.toString() ?? '';
    const stderr = e.stderr?.toString() ?? '';
    throw new Error(
      `tsc failed in ${cwd}: ${e.message ?? err}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
    );
  }
}

async function ensureWorkerDist(): Promise<void> {
  try {
    await access(workerDist);
    return;
  } catch {
    // CI runs test:run before build; worker needs compiled dist + domain types.
  }
  await runTsc(domainRoot);
  await runTsc(pkgRoot);
  await access(workerDist);
}

async function waitFor(check: () => boolean, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe('excelJobWorker (compiled)', () => {
  beforeAll(async () => {
    await ensureWorkerDist();
  }, 60_000);

  it('builds via createExcelJobQueue workerUrl to dist excelJobWorker', async () => {
    const d0 = new Date('2026-07-14T00:00:00.000Z');
    const d1 = new Date('2026-07-15T00:00:00.000Z');
    const world = await createSeededWorld({
      points: [
        { date: d0, stock: 100, price: 10 },
        { date: d1, stock: 70, price: 10 },
      ],
    });

    const queue = createExcelJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      workerUrl: pathToFileURL(workerDist),
    });

    const job = queue.create({
      kind: 'sku-one-sales',
      params: {
        skuId: world.sku.id,
        dateFrom: '2026-07-14',
        dateTo: '2026-07-15',
      },
    });

    await waitFor(() => {
      const status = queue.poll(job.id)?.status;
      return status === 'ready' || status === 'failed';
    });

    const polled = queue.poll(job.id);
    expect(polled?.status).toBe('ready');
    const file = queue.getFile(job.id);
    expect(file?.filename).toContain('sku-one-sales');
    expect(file!.buffer.byteLength).toBeGreaterThan(100);
    expect(file!.buffer.subarray(0, 2).toString('utf8')).toBe('PK');
  });
});
