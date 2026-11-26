import { z } from 'zod';

export const parseSkuPageRequestSchema = z.object({
  konk: z.string().min(1),
  html: z.string().min(1),
  url: z.string().optional(),
  productId: z.string().optional(),
});

export const parseSkugrPageRequestSchema = z.object({
  konk: z.string().min(1),
  html: z.string().min(1),
  url: z.string().optional(),
  productId: z.string().optional(),
});
