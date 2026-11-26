import {
  bandSpikeCorrectRequestSchema,
  bandSpikeDiscoverRequestSchema,
  packFlipRangeRequestSchema,
} from '@balloons/web-api-client';
import {
  applyPackFlips,
  correctBandSpikeRtl,
  discoverBandSpike,
  previewPackFlips,
} from '@balloons/slice-engine';
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { parseWireDate, toWireDate } from '../http/dates.js';
import { asyncHandler } from '../http/errors.js';

export function createCorrectionsRouter(deps: AppDeps): Router {
  const router = Router();

  router.post(
    '/corrections/pack-flips/preview',
    asyncHandler(async (req, res) => {
      const body = packFlipRangeRequestSchema.parse(req.body);
      const result = await previewPackFlips({
        konk: body.konk,
        productIds: body.productIds,
        dateFrom: parseWireDate(body.dateFrom),
        dateTo: parseWireDate(body.dateTo),
        slices: deps.slices,
      });
      res.status(200).json(result);
    }),
  );

  router.post(
    '/corrections/pack-flips/apply',
    asyncHandler(async (req, res) => {
      const body = packFlipRangeRequestSchema.parse(req.body);
      const result = await applyPackFlips({
        konk: body.konk,
        productIds: body.productIds,
        dateFrom: parseWireDate(body.dateFrom),
        dateTo: parseWireDate(body.dateTo),
        slices: deps.slices,
      });
      res.status(200).json(result);
    }),
  );

  router.post(
    '/corrections/band-spike/discover',
    asyncHandler(async (req, res) => {
      const body = bandSpikeDiscoverRequestSchema.parse(req.body);
      const result = await discoverBandSpike({
        konk: body.konk,
        productIds: body.productIds,
        dateFrom: parseWireDate(body.dateFrom),
        dateTo: parseWireDate(body.dateTo),
        stockMin: body.stockMin,
        stockMax: body.stockMax,
        ...(body.normalMax !== undefined ? { normalMax: body.normalMax } : {}),
        slices: deps.slices,
      });
      res.status(200).json({
        ...result,
        window: {
          dateFrom: toWireDate(result.window.dateFrom),
          dateTo: toWireDate(result.window.dateTo),
        },
      });
    }),
  );

  router.post(
    '/corrections/band-spike/correct',
    asyncHandler(async (req, res) => {
      const body = bandSpikeCorrectRequestSchema.parse(req.body);
      const result = await correctBandSpikeRtl({
        konk: body.konk,
        productId: body.productId,
        dateFrom: parseWireDate(body.dateFrom),
        dateTo: parseWireDate(body.dateTo),
        band: body.band,
        apply: body.apply,
        slices: deps.slices,
      });
      res.status(200).json(result);
    }),
  );

  return router;
}
