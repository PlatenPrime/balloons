import { z } from 'zod';

/** Must match web-slices `extensionProtocol.ts`. */
export const BRIDGE_SOURCE = 'balloons-extension-bridge' as const;

export const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export const tokenSyncMessageSchema = z.object({
  source: z.literal(BRIDGE_SOURCE),
  type: z.literal('TOKEN_SYNC'),
  token: z.string().min(1),
  apiBaseUrl: z.string().min(1).optional(),
});

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

export const pageToExtensionMessageSchema = z.discriminatedUnion('type', [
  tokenSyncMessageSchema,
  captureRequestMessageSchema,
]);

export const extensionToPageMessageSchema = captureResultMessageSchema;

export type TokenSyncMessage = z.infer<typeof tokenSyncMessageSchema>;
export type CaptureRequestMessage = z.infer<typeof captureRequestMessageSchema>;
export type CaptureResultMessage = z.infer<typeof captureResultMessageSchema>;
export type PageToExtensionMessage = z.infer<typeof pageToExtensionMessageSchema>;

export type CaptureResultPayload =
  | {
      ok: true;
      requestId: string;
      status: 'saved' | 'skipped';
      productId: string;
      stock: number;
      price: number;
      konk: string;
      skuId: string;
    }
  | {
      ok: false;
      requestId: string;
      code: string;
      message: string;
      konk?: string;
      skuId?: string;
    };

export function parsePageToExtensionMessage(data: unknown): PageToExtensionMessage | null {
  const parsed = pageToExtensionMessageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function parseCaptureResultMessage(data: unknown): CaptureResultMessage | null {
  const parsed = captureResultMessageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Runtime messages between content script and service worker (no `source` required). */
export const swCaptureRequestSchema = z.object({
  type: z.literal('CAPTURE_REQUEST'),
  requestId: z.string().min(1),
  konk: z.string().min(1),
  skuId: z.string().min(1),
  sourceUrl: z.string().min(1),
  token: z.string().min(1).optional(),
  apiBaseUrl: z.string().min(1).optional(),
});

export const swTokenSyncSchema = z.object({
  type: z.literal('TOKEN_SYNC'),
  token: z.string().min(1),
  apiBaseUrl: z.string().min(1).optional(),
});

export const swMessageSchema = z.discriminatedUnion('type', [
  swCaptureRequestSchema,
  swTokenSyncSchema,
]);

export type SwMessage = z.infer<typeof swMessageSchema>;

export function parseSwMessage(data: unknown): SwMessage | null {
  const parsed = swMessageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function toSwMessage(msg: PageToExtensionMessage): SwMessage {
  if (msg.type === 'TOKEN_SYNC') {
    return {
      type: 'TOKEN_SYNC',
      token: msg.token,
      ...(msg.apiBaseUrl !== undefined ? { apiBaseUrl: msg.apiBaseUrl } : {}),
    };
  }
  return {
    type: 'CAPTURE_REQUEST',
    requestId: msg.requestId,
    konk: msg.konk,
    skuId: msg.skuId,
    sourceUrl: msg.sourceUrl,
    ...(msg.token !== undefined ? { token: msg.token } : {}),
    ...(msg.apiBaseUrl !== undefined ? { apiBaseUrl: msg.apiBaseUrl } : {}),
  };
}

export function toCaptureResultPageMessage(result: CaptureResultPayload): CaptureResultMessage {
  if (result.ok) {
    return {
      source: BRIDGE_SOURCE,
      type: 'CAPTURE_RESULT',
      requestId: result.requestId,
      ok: true,
      status: result.status,
      productId: result.productId,
      stock: result.stock,
      price: result.price,
      konk: result.konk,
      skuId: result.skuId,
    };
  }
  return {
    source: BRIDGE_SOURCE,
    type: 'CAPTURE_RESULT',
    requestId: result.requestId,
    ok: false,
    code: result.code,
    message: result.message,
    ...(result.konk !== undefined ? { konk: result.konk } : {}),
    ...(result.skuId !== undefined ? { skuId: result.skuId } : {}),
  };
}
