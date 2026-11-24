import { batchCorrectStockBand } from './bandSpike.js';
import { runCompensationForKonk } from './runCompensationForKonk.js';
import { runSliceForKonk } from './runSliceForKonk.js';
import type { SliceEngineDeps } from './types.js';

export type SliceJobKind = 'slice.run' | 'compensation.run' | 'stock-band.batch-correct';

export type SliceJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type SliceJobPayload =
  | { kind: 'slice.run'; konk: string; day: Date }
  | { kind: 'compensation.run'; konk: string; day?: Date }
  | {
      kind: 'stock-band.batch-correct';
      bandId: string;
      productIds: string[];
      dateFrom: Date;
      dateTo: Date;
    };

export type SliceJob = {
  id: string;
  kind: SliceJobKind;
  status: SliceJobStatus;
  createdAt: Date;
  updatedAt: Date;
  payload: SliceJobPayload;
  result?: unknown;
  error?: string;
};

export type SliceJobQueue = {
  create(payload: SliceJobPayload): SliceJob;
  poll(id: string): SliceJob | null;
  cancel(id: string): boolean;
  list(): SliceJob[];
};

let jobSeq = 0;

function nextJobId(): string {
  jobSeq += 1;
  return `slice-job-${jobSeq}`;
}

/**
 * In-process FIFO queue for slice / compensation / band batch-correct.
 * Single-flight: one runner at a time; cancel aborts the active job via AbortController.
 */
export function createSliceJobQueue(deps: SliceEngineDeps): SliceJobQueue {
  const jobs = new Map<string, SliceJob>();
  const queue: string[] = [];
  const controllers = new Map<string, AbortController>();
  let pumping = false;

  function touch(job: SliceJob, patch: Partial<SliceJob>): SliceJob {
    const next: SliceJob = {
      ...job,
      ...patch,
      updatedAt: new Date(),
    };
    jobs.set(job.id, next);
    return next;
  }

  async function runJob(job: SliceJob): Promise<void> {
    const controller = new AbortController();
    controllers.set(job.id, controller);
    touch(job, { status: 'running' });

    try {
      let result: unknown;
      switch (job.payload.kind) {
        case 'slice.run':
          result = await runSliceForKonk({
            konk: job.payload.konk,
            day: job.payload.day,
            deps,
            signal: controller.signal,
          });
          break;
        case 'compensation.run': {
          const payload = job.payload;
          result = await runCompensationForKonk({
            konk: payload.konk,
            deps,
            signal: controller.signal,
            ...(payload.day ? { day: payload.day } : {}),
          });
          break;
        }
        case 'stock-band.batch-correct':
          result = await batchCorrectStockBand({
            catalog: deps.catalog,
            slices: deps.slices,
            bandId: job.payload.bandId,
            productIds: job.payload.productIds,
            dateFrom: job.payload.dateFrom,
            dateTo: job.payload.dateTo,
            signal: controller.signal,
          });
          break;
        default: {
          const _exhaustive: never = job.payload;
          throw new Error(`Unknown job kind: ${JSON.stringify(_exhaustive)}`);
        }
      }

      const current = jobs.get(job.id);
      if (current?.status === 'cancelled') {
        return;
      }
      touch(job, { status: 'completed', result });
    } catch (err) {
      const current = jobs.get(job.id);
      if (current?.status === 'cancelled' || (err instanceof Error && err.name === 'AbortError')) {
        touch(job, { status: 'cancelled', error: 'cancelled' });
        return;
      }
      touch(job, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      controllers.delete(job.id);
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
      const now = new Date();
      const job: SliceJob = {
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
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return false;
      }
      if (job.status === 'queued') {
        const idx = queue.indexOf(id);
        if (idx >= 0) queue.splice(idx, 1);
        touch(job, { status: 'cancelled', error: 'cancelled' });
        return true;
      }
      controllers.get(id)?.abort();
      touch(job, { status: 'cancelled', error: 'cancelled' });
      return true;
    },
    list() {
      return [...jobs.values()];
    },
  };
}
