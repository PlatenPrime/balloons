import { z } from 'zod';

/** Must match `@balloons/extension` `src/shared/protocol.ts`. */
export const BRIDGE_SOURCE = 'balloons-extension-bridge' as const;

export const captureRequestMessageSchema = z.object({
  source: z.literal(BRIDGE_SOURCE),
  type: z.literal('CAPTURE_REQUEST'),
  requestId: z.string().min(1),
  konk: z.string().min(1),
  skuId: z.string().min(1),
  sourceUrl: z.string().min(1),
  token: z.string().min(1).optional(),
  apiBaseUrl: z.string().min(1).optional(),
});

export const captureResultSuccessSchema = z.object({
  source: z.literal(BRIDGE_SOURCE),
  type: z.literal('CAPTURE_RESULT'),
  requestId: z.string().min(1),
  ok: z.literal(true),
  status: z.enum(['saved', 'skipped']),
  productId: z.string(),
  stock: z.number(),
  price: z.number(),
  konk: z.string(),
  skuId: z.string(),
});

export const captureResultErrorSchema = z.object({
  source: z.literal(BRIDGE_SOURCE),
  type: z.literal('CAPTURE_RESULT'),
  requestId: z.string().min(1),
  ok: z.literal(false),
  code: z.string().min(1),
  message: z.string().min(1),
  konk: z.string().optional(),
  skuId: z.string().optional(),
});

export const captureResultMessageSchema = z.discriminatedUnion('ok', [
  captureResultSuccessSchema,
  captureResultErrorSchema,
]);

export type CaptureResultMessage = z.infer<typeof captureResultMessageSchema>;

export function parseCaptureResultMessage(data: unknown): CaptureResultMessage | null {
  const parsed = captureResultMessageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
