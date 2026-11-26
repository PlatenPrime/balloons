import { z } from 'zod';
import { wireDateSchema } from './common.js';

export const reportDateRangeQuerySchema = z.object({
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
});

export const reportSkuByDateQuerySchema = z.object({
  skuId: z.string().min(1),
  date: wireDateSchema,
});

export const reportSkuRangeQuerySchema = z.object({
  skuId: z.string().min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
});

export const reportSkugrQuerySchema = z.object({
  skugrId: z.string().min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
});

export const reportKonkProdQuerySchema = z.object({
  konk: z.string().min(1),
  prod: z.string().min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
  skugrIds: z.string().optional(),
});

export const reportManufacturersPieQuerySchema = z.object({
  konk: z.string().min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
});

export const reportProdKonksPieQuerySchema = z.object({
  prod: z.string().min(1),
  dateFrom: wireDateSchema,
  dateTo: wireDateSchema,
  excludeKonks: z.string().optional(),
});

export const reportSelectionPieQuerySchema = z
  .object({
    dateFrom: wireDateSchema,
    dateTo: wireDateSchema,
    skuIds: z.string().optional(),
    selectAll: z.enum(['true', '1']).optional(),
    search: z.string().optional(),
    konkName: z.string().optional(),
    prodName: z.string().optional(),
  })
  .refine((v) => Boolean(v.skuIds) || v.selectAll === 'true' || v.selectAll === '1', {
    message: 'Provide skuIds or selectAll=true',
  });
