import { createSliceJobRequestSchema } from '@balloons/web-api-client';
import type { SliceJob } from '@balloons/slice-engine';
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { parseWireDate } from '../http/dates.js';
import { asyncHandler, HttpError } from '../http/errors.js';
import { pathParam } from '../http/params.js';
import { serializeSliceJob } from '../serialize.js';

function createJobFromRequest(
  deps: AppDeps,
  body: ReturnType<typeof createSliceJobRequestSchema.parse>,
): SliceJob {
  switch (body.kind) {
    case 'slice.run':
      return deps.sliceJobs.create({
        kind: 'slice.run',
        konk: body.konk,
        day: parseWireDate(body.day),
      });
    case 'compensation.run':
      return deps.sliceJobs.create({
        kind: 'compensation.run',
        konk: body.konk,
        ...(body.day ? { day: parseWireDate(body.day) } : {}),
      });
    case 'stock-band.batch-correct':
      return deps.sliceJobs.create({
        kind: 'stock-band.batch-correct',
        bandId: body.bandId,
        productIds: body.productIds,
        dateFrom: parseWireDate(body.dateFrom),
        dateTo: parseWireDate(body.dateTo),
      });
    default: {
      const _exhaustive: never = body;
      throw new HttpError(400, `unsupported_slice_job_kind:${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function createSliceJobsRouter(deps: AppDeps): Router {
  const router = Router();

  router.post(
    '/slice-jobs',
    asyncHandler(async (req, res) => {
      const body = createSliceJobRequestSchema.parse(req.body);
      const job = createJobFromRequest(deps, body);
      res.status(202).json(serializeSliceJob(job));
    }),
  );

  router.get(
    '/slice-jobs',
    asyncHandler(async (_req, res) => {
      res.status(200).json({ items: deps.sliceJobs.list().map(serializeSliceJob) });
    }),
  );

  router.get(
    '/slice-jobs/:id',
    asyncHandler(async (req, res) => {
      const job = deps.sliceJobs.poll(pathParam(req, 'id'));
      if (!job) throw new HttpError(404, 'slice_job_not_found');
      res.status(200).json(serializeSliceJob(job));
    }),
  );

  router.post(
    '/slice-jobs/:id/cancel',
    asyncHandler(async (req, res) => {
      const id = pathParam(req, 'id');
      const existing = deps.sliceJobs.poll(id);
      if (!existing) throw new HttpError(404, 'slice_job_not_found');
      deps.sliceJobs.cancel(id);
      const job = deps.sliceJobs.poll(id);
      if (!job) throw new HttpError(404, 'slice_job_not_found');
      res.status(200).json(serializeSliceJob(job));
    }),
  );

  return router;
}
