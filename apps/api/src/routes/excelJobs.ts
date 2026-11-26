import { createExcelJobRequestSchema } from '@balloons/web-api-client';
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { asyncHandler, HttpError } from '../http/errors.js';
import { pathParam } from '../http/params.js';
import { serializeExcelJob } from '../serialize.js';

export function createExcelJobsRouter(deps: AppDeps): Router {
  const router = Router();

  router.post(
    '/excel-jobs',
    asyncHandler(async (req, res) => {
      const body = createExcelJobRequestSchema.parse(req.body);
      const job = deps.excelJobs.create({
        kind: body.kind,
        params: body.params,
      });
      res.status(202).json(serializeExcelJob(job));
    }),
  );

  router.get(
    '/excel-jobs',
    asyncHandler(async (_req, res) => {
      res.status(200).json({ items: deps.excelJobs.list().map(serializeExcelJob) });
    }),
  );

  router.get(
    '/excel-jobs/:id',
    asyncHandler(async (req, res) => {
      const job = deps.excelJobs.poll(pathParam(req, 'id'));
      if (!job) throw new HttpError(404, 'excel_job_not_found');
      res.status(200).json(serializeExcelJob(job));
    }),
  );

  router.post(
    '/excel-jobs/:id/cancel',
    asyncHandler(async (req, res) => {
      const id = pathParam(req, 'id');
      const existing = deps.excelJobs.poll(id);
      if (!existing) throw new HttpError(404, 'excel_job_not_found');
      deps.excelJobs.cancel(id);
      const job = deps.excelJobs.poll(id);
      if (!job) throw new HttpError(404, 'excel_job_not_found');
      res.status(200).json(serializeExcelJob(job));
    }),
  );

  router.get(
    '/excel-jobs/:id/file',
    asyncHandler(async (req, res) => {
      const file = deps.excelJobs.getFile(pathParam(req, 'id'));
      if (!file) throw new HttpError(404, 'excel_file_not_ready');
      res.setHeader(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('content-disposition', `attachment; filename="${file.filename}"`);
      res.status(200).send(file.buffer);
    }),
  );

  return router;
}
