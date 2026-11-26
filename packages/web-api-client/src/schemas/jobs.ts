import { z } from 'zod';
import { wireDateSchema } from './common.js';

export const sliceJobKindSchema = z.enum([
  'slice.run',
  'compensation.run',
  'stock-band.batch-correct',
]);

export const sliceJobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const createSliceJobRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('slice.run'),
    konk: z.string().min(1),
    day: wireDateSchema,
  }),
  z.object({
    kind: z.literal('compensation.run'),
    konk: z.string().min(1),
    day: wireDateSchema.optional(),
  }),
  z.object({
    kind: z.literal('stock-band.batch-correct'),
    bandId: z.string().min(1),
    productIds: z.array(z.string().min(1)).min(1),
    dateFrom: wireDateSchema,
    dateTo: wireDateSchema,
  }),
]);

export const sliceJobSchema = z.object({
  id: z.string(),
  kind: sliceJobKindSchema,
  status: sliceJobStatusSchema,
  createdAt: wireDateSchema,
  updatedAt: wireDateSchema,
  payload: z.unknown(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export const excelSkuKindSchema = z.enum([
  'sku-catalog-new-since',
  'sku-catalog-invalid',
  'sku-one-stock',
  'sku-one-sales',
  'sku-skugr-stock',
  'sku-skugr-sales',
  'sku-skugr-skus-share',
  'sku-konk-stock',
  'sku-konk-sales',
  'sku-selection-stock',
  'sku-selection-sales',
]);

export const excelJobStatusSchema = z.enum(['queued', 'running', 'ready', 'failed', 'cancelled']);

export const createExcelJobRequestSchema = z.object({
  kind: excelSkuKindSchema,
  params: z.record(z.string(), z.unknown()),
});

export const excelJobSchema = z.object({
  id: z.string(),
  kind: excelSkuKindSchema,
  status: excelJobStatusSchema,
  createdAt: wireDateSchema,
  updatedAt: wireDateSchema,
  payload: z.object({
    kind: excelSkuKindSchema,
    params: z.record(z.string(), z.unknown()),
  }),
  filename: z.string().optional(),
  error: z.string().optional(),
});
