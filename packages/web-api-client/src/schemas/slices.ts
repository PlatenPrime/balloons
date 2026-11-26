import { z } from 'zod';
import { sliceDayMetaSchema, slicePointSchema, wireDateSchema } from './common.js';

export const upsertDayMetaRequestSchema = z.object({
  rotationMeta: z
    .object({
      cycleDays: z.number(),
      dayIndex: z.number(),
      dueCount: z.number(),
    })
    .nullable()
    .optional(),
  stats: z
    .object({
      filled: z.number(),
      invalid: z.number(),
      errorCount: z.number(),
      dueTotal: z.number().optional(),
      abortReason: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const upsertPointRequestSchema = z.object({
  date: wireDateSchema,
  point: slicePointSchema,
});

export const dayPointsResponseSchema = z.object({
  konkName: z.string(),
  date: wireDateSchema,
  items: z.array(
    z.object({
      productId: z.string(),
      point: slicePointSchema,
    }),
  ),
});

export const pendingResponseSchema = z.object({
  konkName: z.string(),
  date: wireDateSchema,
  items: z.array(
    z.object({
      skuId: z.string(),
      productId: z.string(),
      title: z.string(),
      url: z.string(),
    }),
  ),
});

export const ingestHtmlRequestSchema = z.object({
  skuId: z.string().min(1),
  html: z.string().min(1),
  sourceUrl: z.string().min(1),
});

export const ingestHtmlResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    status: z.enum(['saved', 'skipped']),
    date: wireDateSchema,
    productId: z.string(),
    stock: z.number(),
    price: z.number(),
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum([
      'SKU_NOT_FOUND',
      'KONK_MISMATCH',
      'NOT_SLICED',
      'URL_MISMATCH',
      'PARSE_FAILED',
      'NO_PRODUCT_ID',
    ]),
    message: z.string(),
  }),
]);

export const dayMetaResponseSchema = sliceDayMetaSchema.nullable();
