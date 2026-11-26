import { z } from 'zod';
import {
  konkSchema,
  prodSchema,
  skuSchema,
  skugrSchema,
  stockBandSchema,
  wireDateSchema,
} from './common.js';

export const seedKonkRequestSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  title: z.string().min(1),
  url: z.string().default(''),
  imageUrl: z.string().default(''),
  recountDays: z.array(z.string()).default([]),
});

export const seedProdRequestSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  title: z.string().min(1),
  imageUrl: z.string().default(''),
});

export const seedSkuRequestSchema = z.object({
  id: z.string().optional(),
  konkName: z.string().min(1),
  prodName: z.string().min(1),
  productId: z.string().min(1),
  artikul: z.string().default(''),
  title: z.string().min(1),
  url: z.string().default(''),
  imageUrl: z.string().default(''),
  isInvalid: z.boolean().default(false),
});

export const seedSkugrRequestSchema = z.object({
  id: z.string().optional(),
  konkName: z.string().min(1),
  prodName: z.string().min(1),
  title: z.string().min(1),
  url: z.string().default(''),
  isSliced: z.boolean().default(true),
  skuIds: z.array(z.string()).default([]),
});

export const seedStockBandRequestSchema = z.object({
  id: z.string().optional(),
  konk: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
  }),
  stockMin: z.number(),
  stockMax: z.number(),
  normalMax: z.number(),
});

export const updateStockBandRequestSchema = z.object({
  id: z.string().min(1),
  konk: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
  }),
  stockMin: z.number(),
  stockMax: z.number(),
  normalMax: z.number(),
});

export const stockBandDiscoverRequestSchema = z.object({
  bandId: z.string().min(1),
  productIds: z.array(z.string().min(1)).min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
});

export const stockBandBatchCorrectRequestSchema = z.object({
  bandId: z.string().min(1),
  productIds: z.array(z.string().min(1)).min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
});

export const listKonksResponseSchema = z.object({ items: z.array(konkSchema) });
export const listProdsResponseSchema = z.object({ items: z.array(prodSchema) });
export const listSkusResponseSchema = z.object({ items: z.array(skuSchema) });
export const listSkugrsResponseSchema = z.object({ items: z.array(skugrSchema) });
export const listStockBandsResponseSchema = z.object({ items: z.array(stockBandSchema) });
