import { parseSkuPageRequestSchema, parseSkugrPageRequestSchema } from '@balloons/web-api-client';
import { parseSkuPage, parseSkugrPage } from '@balloons/browser';
import { Router } from 'express';
import { asyncHandler, HttpError } from '../http/errors.js';

export function createBrowserDebugRouter(): Router {
  const router = Router();

  router.post(
    '/browser-debug/parse-sku',
    asyncHandler(async (req, res) => {
      const body = parseSkuPageRequestSchema.parse(req.body);
      try {
        const ctx: { konk: string; url?: string; productId?: string } = { konk: body.konk };
        if (body.url !== undefined) ctx.url = body.url;
        if (body.productId !== undefined) ctx.productId = body.productId;
        const result = parseSkuPage(body.html, ctx);
        res.status(200).json(result);
      } catch (err) {
        throw new HttpError(400, err instanceof Error ? err.message : 'parse_failed');
      }
    }),
  );

  router.post(
    '/browser-debug/parse-skugr',
    asyncHandler(async (req, res) => {
      const body = parseSkugrPageRequestSchema.parse(req.body);
      try {
        const ctx: { konk: string; url?: string; productId?: string } = { konk: body.konk };
        if (body.url !== undefined) ctx.url = body.url;
        if (body.productId !== undefined) ctx.productId = body.productId;
        const result = parseSkugrPage(body.html, ctx);
        res.status(200).json(result);
      } catch (err) {
        throw new HttpError(400, err instanceof Error ? err.message : 'parse_failed');
      }
    }),
  );

  return router;
}
