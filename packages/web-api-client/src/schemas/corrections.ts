import { z } from 'zod';
import { wireDateSchema } from './common.js';

export const packFlipRangeRequestSchema = z.object({
  konk: z.string().min(1),
  productIds: z.array(z.string().min(1)).min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
});

export const bandSpikeDiscoverRequestSchema = z.object({
  konk: z.string().min(1),
  productIds: z.array(z.string().min(1)).min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
  stockMin: z.number(),
  stockMax: z.number(),
  normalMax: z.number().optional(),
});

export const bandSpikeCorrectRequestSchema = z.object({
  konk: z.string().min(1),
  productId: z.string().min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
  band: z.object({
    bandMin: z.number(),
    bandMax: z.number(),
    normalMax: z.number(),
  }),
  apply: z.boolean().default(false),
});
