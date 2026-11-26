import { z } from 'zod';

/** Wire date: `YYYY-MM-DD` or full ISO instant. */
export const wireDateSchema = z.string().min(1);

export const healthResponseSchema = z.object({
  ok: z.literal(true),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

export const slicePointSchema = z.object({
  stock: z.number(),
  price: z.number(),
});

export const konkSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  url: z.string(),
  imageUrl: z.string(),
  recountDays: z.array(z.string()),
});

export const prodSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  imageUrl: z.string(),
});

export const skuSchema = z.object({
  id: z.string(),
  konkName: z.string(),
  prodName: z.string(),
  productId: z.string(),
  artikul: z.string(),
  title: z.string(),
  url: z.string(),
  imageUrl: z.string(),
  isInvalid: z.boolean(),
});

export const skugrSchema = z.object({
  id: z.string(),
  konkName: z.string(),
  prodName: z.string(),
  title: z.string(),
  url: z.string(),
  isSliced: z.boolean(),
  skuIds: z.array(z.string()),
});

export const stockBandKonkSchema = z.object({
  name: z.string(),
  title: z.string(),
});

export const stockBandSchema = z.object({
  id: z.string(),
  konk: stockBandKonkSchema,
  stockMin: z.number(),
  stockMax: z.number(),
  normalMax: z.number(),
});

export const sliceRotationMetaSchema = z.object({
  cycleDays: z.number(),
  dayIndex: z.number(),
  dueCount: z.number(),
});

export const sliceDayRunStatsSchema = z.object({
  filled: z.number(),
  invalid: z.number(),
  errorCount: z.number(),
  dueTotal: z.number().optional(),
  abortReason: z.string().optional(),
});

export const sliceDayMetaSchema = z.object({
  konkName: z.string(),
  date: wireDateSchema,
  rotationMeta: sliceRotationMetaSchema.optional(),
  stats: sliceDayRunStatsSchema.optional(),
});
