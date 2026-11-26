import {
  ingestHtmlRequestSchema,
  upsertDayMetaRequestSchema,
  upsertPointRequestSchema,
} from '@balloons/web-api-client';
import type { SliceDayRunStats, UpsertSliceDayMetaInput } from '@balloons/domain';
import { ingestHtml, listPending } from '@balloons/slice-engine';
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { parseWireDate, toWireDate } from '../http/dates.js';
import { asyncHandler } from '../http/errors.js';
import { pathParam } from '../http/params.js';
import { serializeDayMeta } from '../serialize.js';

function toDayRunStats(
  stats: {
    filled: number;
    invalid: number;
    errorCount: number;
    dueTotal?: number | undefined;
    abortReason?: string | undefined;
  } | null,
): SliceDayRunStats | null {
  if (stats === null) return null;
  const out: SliceDayRunStats = {
    filled: stats.filled,
    invalid: stats.invalid,
    errorCount: stats.errorCount,
  };
  if (stats.dueTotal !== undefined) out.dueTotal = stats.dueTotal;
  if (stats.abortReason !== undefined) out.abortReason = stats.abortReason;
  return out;
}

export function createSlicesRouter(deps: AppDeps): Router {
  const router = Router();

  router.get(
    '/slices/:konk/days/:date/meta',
    asyncHandler(async (req, res) => {
      const meta = await deps.slices.getDayMeta(
        pathParam(req, 'konk'),
        parseWireDate(pathParam(req, 'date')),
      );
      res.status(200).json(serializeDayMeta(meta));
    }),
  );

  router.put(
    '/slices/:konk/days/:date/meta',
    asyncHandler(async (req, res) => {
      const body = upsertDayMetaRequestSchema.parse(req.body);
      const input: UpsertSliceDayMetaInput = {
        konkName: pathParam(req, 'konk'),
        date: parseWireDate(pathParam(req, 'date')),
      };
      if (body.rotationMeta !== undefined) {
        input.rotationMeta = body.rotationMeta;
      }
      if (body.stats !== undefined) {
        input.stats = toDayRunStats(body.stats);
      }
      const meta = await deps.slices.upsertDayMeta(input);
      res.status(200).json(serializeDayMeta(meta));
    }),
  );

  router.get(
    '/slices/:konk/days/:date/points',
    asyncHandler(async (req, res) => {
      const konk = pathParam(req, 'konk');
      const date = parseWireDate(pathParam(req, 'date'));
      const items = await deps.slices.listPointsForDay(konk, date);
      res.status(200).json({
        konkName: konk,
        date: toWireDate(date),
        items,
      });
    }),
  );

  router.put(
    '/slices/:konk/points/:productId',
    asyncHandler(async (req, res) => {
      const body = upsertPointRequestSchema.parse(req.body);
      const point = await deps.slices.upsertPoint({
        konkName: pathParam(req, 'konk'),
        productId: pathParam(req, 'productId'),
        date: parseWireDate(body.date),
        point: body.point,
      });
      res.status(200).json(point);
    }),
  );

  router.get(
    '/slices/:konk/pending',
    asyncHandler(async (req, res) => {
      const result = await listPending({
        konk: pathParam(req, 'konk'),
        catalog: deps.catalog,
        slices: deps.slices,
      });
      res.status(200).json({
        konkName: result.konkName,
        date: toWireDate(result.date),
        items: result.items,
      });
    }),
  );

  router.post(
    '/slices/:konk/ingest',
    asyncHandler(async (req, res) => {
      const body = ingestHtmlRequestSchema.parse(req.body);
      const result = await ingestHtml({
        konk: pathParam(req, 'konk'),
        skuId: body.skuId,
        html: body.html,
        sourceUrl: body.sourceUrl,
        catalog: deps.catalog,
        slices: deps.slices,
      });
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.status(200).json({
        ...result,
        date: toWireDate(result.date),
      });
    }),
  );

  return router;
}
