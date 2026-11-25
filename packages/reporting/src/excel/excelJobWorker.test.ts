import { createSeededWorld } from '@balloons/memory';
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { createExcelJobQueue } from './excelJobs.js';

const execFileAsync = promisify(execFile);
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const workerDist = join(pkgRoot, 'dist/excel/excelJobWorker.js');

async function waitFor(check: () => boolean, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe('excelJobWorker (compiled)', () => {
  beforeAll(async () => {
    try {
      await access(workerDist);
    } catch {
      await execFileAsync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['tsc', '-p', 'tsconfig.json'],
        { cwd: pkgRoot },
      );
    }
    await access(workerDist);
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
