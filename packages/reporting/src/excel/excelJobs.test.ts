import { createSeededWorld } from '@balloons/memory';
import { describe, expect, it } from 'vitest';
import { createExcelJobQueue } from './excelJobs.js';

async function waitFor(check: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('excelJobs', () => {
  it('cancels a queued job before it runs', async () => {
    const world = await createSeededWorld();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const queue = createExcelJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      build: async () => {
        await gate;
        return { filename: 'x.xlsx', buffer: Buffer.from('PK') };
      },
    });

    const first = queue.create({ kind: 'sku-catalog-invalid', params: { konk: 'air' } });
    const second = queue.create({ kind: 'sku-catalog-invalid', params: { konk: 'air' } });

    await waitFor(() => queue.poll(first.id)?.status === 'running');
    expect(queue.cancel(second.id)).toBe(true);
    expect(queue.poll(second.id)?.status).toBe('cancelled');
    expect(queue.getFile(second.id)).toBeNull();

    release();
    await waitFor(() => queue.poll(first.id)?.status === 'ready');
  });

  it('cancels a running job', async () => {
    const world = await createSeededWorld();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const queue = createExcelJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      build: async () => {
        await gate;
        return { filename: 'x.xlsx', buffer: Buffer.from('PK') };
      },
    });

    const job = queue.create({ kind: 'sku-catalog-invalid', params: { konk: 'air' } });
    await waitFor(() => queue.poll(job.id)?.status === 'running');
    expect(queue.cancel(job.id)).toBe(true);
    expect(queue.poll(job.id)?.status).toBe('cancelled');
    expect(queue.getFile(job.id)).toBeNull();
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(queue.poll(job.id)?.status).toBe('cancelled');
  });

  it('marks job failed when build throws; getFile only when ready', async () => {
    const world = await createSeededWorld();
    const queue = createExcelJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      build: async () => {
        throw new Error('boom');
      },
    });

    const job = queue.create({ kind: 'sku-catalog-invalid', params: { konk: 'air' } });
    expect(queue.getFile(job.id)).toBeNull();

    await waitFor(() => queue.poll(job.id)?.status === 'failed');
    expect(queue.poll(job.id)?.error).toContain('boom');
    expect(queue.getFile(job.id)).toBeNull();

    const okQueue = createExcelJobQueue({
      catalog: world.catalog,
      slices: world.slices,
      build: async () => ({ filename: 'ok.xlsx', buffer: Buffer.from('PK') }),
    });
    const ok = okQueue.create({ kind: 'sku-catalog-invalid', params: { konk: 'air' } });
    await waitFor(() => okQueue.poll(ok.id)?.status === 'ready');
    expect(okQueue.getFile(ok.id)).toEqual({
      filename: 'ok.xlsx',
      buffer: Buffer.from('PK'),
    });
  });
});
