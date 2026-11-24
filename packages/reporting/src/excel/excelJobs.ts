import type { CatalogStore, SliceStore } from '@balloons/domain';
import { Worker } from 'node:worker_threads';
import { buildExcelFromSnapshot, type ExcelBuildResult } from './builders.js';
import { isExcelSkuKind, type ExcelSkuKind } from './kinds.js';
import { buildExcelSnapshot, type ExcelSnapshot } from './snapshot.js';

export type ExcelJobStatus = 'queued' | 'running' | 'ready' | 'failed' | 'cancelled';

export type ExcelJobPayload = {
  kind: ExcelSkuKind;
  params: Record<string, unknown>;
};

export type ExcelJob = {
  id: string;
  kind: ExcelSkuKind;
  status: ExcelJobStatus;
  createdAt: Date;
  updatedAt: Date;
  payload: ExcelJobPayload;
  filename?: string;
  buffer?: Buffer;
  error?: string;
};

export type ExcelJobQueueDeps = {
  catalog: CatalogStore;
  slices: SliceStore;
  /**
   * Injectable builder for unit tests (sync path, no worker).
   * Default: load snapshot on main, build in worker_threads.
   */
  build?: (kind: ExcelSkuKind, params: Record<string, unknown>) => Promise<ExcelBuildResult>;
  /** Force in-process build even without custom `build` (tests). */
  useInProcessBuild?: boolean;
  workerUrl?: URL;
};

export type ExcelJobQueue = {
  create(payload: ExcelJobPayload): ExcelJob;
  poll(id: string): ExcelJob | null;
  cancel(id: string): boolean;
  list(): ExcelJob[];
  getFile(id: string): { filename: string; buffer: Buffer } | null;
};

let jobSeq = 0;

function nextJobId(): string {
  jobSeq += 1;
  return `excel-job-${jobSeq}`;
}

function defaultWorkerUrl(): URL {
  return new URL('./excelJobWorker.js', import.meta.url);
}

async function runInWorker(
  workerUrl: URL,
  kind: ExcelSkuKind,
  params: Record<string, unknown>,
  snapshot: ExcelSnapshot,
): Promise<ExcelBuildResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, {
      workerData: { kind, params, snapshot },
    });
    worker.on(
      'message',
      (msg: { ok: boolean; filename?: string; buffer?: ArrayBuffer; error?: string }) => {
        if (!msg.ok) {
          reject(new Error(msg.error ?? 'excel worker failed'));
          return;
        }
        resolve({
          filename: msg.filename ?? `${kind}.xlsx`,
          buffer: Buffer.from(msg.buffer ?? new ArrayBuffer(0)),
        });
      },
    );
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`excel worker exited with code ${code}`));
    });
  });
}

/**
 * In-process FIFO excel queue. Build runs in worker_threads by default
 * so planning stays independent from sliceJobs on the main thread.
 */
export function createExcelJobQueue(deps: ExcelJobQueueDeps): ExcelJobQueue {
  const jobs = new Map<string, ExcelJob>();
  const queue: string[] = [];
  const workers = new Map<string, Worker>();
  let pumping = false;
  const workerUrl = deps.workerUrl ?? defaultWorkerUrl();

  function touch(job: ExcelJob, patch: Partial<ExcelJob>): ExcelJob {
    const next: ExcelJob = {
      ...job,
      ...patch,
      updatedAt: new Date(),
    };
    jobs.set(job.id, next);
    return next;
  }

  async function buildJob(payload: ExcelJobPayload): Promise<ExcelBuildResult> {
    if (deps.build) {
      return deps.build(payload.kind, payload.params);
    }
    const snapshot = await buildExcelSnapshot({
      kind: payload.kind,
      jobParams: payload.params,
      catalog: deps.catalog,
      slices: deps.slices,
    });
    if (deps.useInProcessBuild) {
      return buildExcelFromSnapshot(payload.kind, payload.params, snapshot);
    }
    // Prefer compiled worker next to this module; fall back to in-process if missing (vitest src).
    try {
      return await runInWorker(workerUrl, payload.kind, payload.params, snapshot);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Cannot find module') || msg.includes('ENOENT')) {
        return buildExcelFromSnapshot(payload.kind, payload.params, snapshot);
      }
      throw err;
    }
  }

  async function runJob(job: ExcelJob): Promise<void> {
    touch(job, { status: 'running' });
    try {
      const result = await buildJob(job.payload);
      const current = jobs.get(job.id);
      if (current?.status === 'cancelled') return;
      touch(job, {
        status: 'ready',
        filename: result.filename,
        buffer: result.buffer,
      });
    } catch (err) {
      const current = jobs.get(job.id);
      if (current?.status === 'cancelled') return;
      touch(job, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      workers.delete(job.id);
    }
  }

  async function pump(): Promise<void> {
    if (pumping) return;
    pumping = true;
    try {
      while (queue.length > 0) {
        const id = queue.shift()!;
        const job = jobs.get(id);
        if (!job || job.status !== 'queued') continue;
        await runJob(job);
      }
    } finally {
      pumping = false;
    }
  }

  return {
    create(payload) {
      if (!isExcelSkuKind(payload.kind)) {
        throw new Error(`Unsupported excel kind: ${payload.kind}`);
      }
      const now = new Date();
      const job: ExcelJob = {
        id: nextJobId(),
        kind: payload.kind,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
        payload,
      };
      jobs.set(job.id, job);
      queue.push(job.id);
      void pump();
      return job;
    },
    poll(id) {
      return jobs.get(id) ?? null;
    },
    cancel(id) {
      const job = jobs.get(id);
      if (!job) return false;
      if (job.status === 'ready' || job.status === 'failed' || job.status === 'cancelled') {
        return false;
      }
      if (job.status === 'queued') {
        const idx = queue.indexOf(id);
        if (idx >= 0) queue.splice(idx, 1);
        touch(job, { status: 'cancelled', error: 'cancelled' });
        return true;
      }
      workers.get(id)?.terminate();
      touch(job, { status: 'cancelled', error: 'cancelled' });
      return true;
    },
    list() {
      return [...jobs.values()];
    },
    getFile(id) {
      const job = jobs.get(id);
      if (!job || job.status !== 'ready' || !job.buffer || !job.filename) return null;
      return { filename: job.filename, buffer: job.buffer };
    },
  };
}
