import type { SliceDayMeta } from '@balloons/domain';
import type { ExcelJob } from '@balloons/reporting';
import type { SliceJob } from '@balloons/slice-engine';
import { toWireDate, toWireInstant } from './http/dates.js';

export function serializeDayMeta(meta: SliceDayMeta | null) {
  if (!meta) return null;
  return {
    konkName: meta.konkName,
    date: toWireDate(meta.date),
    ...(meta.rotationMeta ? { rotationMeta: meta.rotationMeta } : {}),
    ...(meta.stats ? { stats: meta.stats } : {}),
  };
}

export function serializeSliceJob(job: SliceJob) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    createdAt: toWireInstant(job.createdAt),
    updatedAt: toWireInstant(job.updatedAt),
    payload: serializeSliceJobPayload(job.payload),
    ...(job.result !== undefined ? { result: job.result } : {}),
    ...(job.error !== undefined ? { error: job.error } : {}),
  };
}

function serializeSliceJobPayload(payload: SliceJob['payload']): unknown {
  switch (payload.kind) {
    case 'slice.run':
      return { kind: payload.kind, konk: payload.konk, day: toWireDate(payload.day) };
    case 'compensation.run':
      return {
        kind: payload.kind,
        konk: payload.konk,
        ...(payload.day ? { day: toWireDate(payload.day) } : {}),
      };
    case 'stock-band.batch-correct':
      return {
        kind: payload.kind,
        bandId: payload.bandId,
        productIds: payload.productIds,
        dateFrom: toWireDate(payload.dateFrom),
        dateTo: toWireDate(payload.dateTo),
      };
    default: {
      const _exhaustive: never = payload;
      throw new Error(`Unknown slice job payload: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function serializeExcelJob(job: ExcelJob) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    createdAt: toWireInstant(job.createdAt),
    updatedAt: toWireInstant(job.updatedAt),
    payload: job.payload,
    ...(job.filename !== undefined ? { filename: job.filename } : {}),
    ...(job.error !== undefined ? { error: job.error } : {}),
  };
}
