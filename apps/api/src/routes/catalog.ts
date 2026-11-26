import {
  seedKonkRequestSchema,
  seedProdRequestSchema,
  seedSkuRequestSchema,
  seedSkugrRequestSchema,
  seedStockBandRequestSchema,
  stockBandBatchCorrectRequestSchema,
  stockBandDiscoverRequestSchema,
  updateStockBandRequestSchema,
} from '@balloons/web-api-client';
import { discoverStockBand } from '@balloons/slice-engine';
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { parseWireDate, toWireDate } from '../http/dates.js';
import { asyncHandler, HttpError } from '../http/errors.js';
import { pathParam } from '../http/params.js';
import { serializeSliceJob } from '../serialize.js';

let seedSeq = 0;
function nextSeedId(prefix: string): string {
  seedSeq += 1;
  return `${prefix}-${seedSeq}`;
}

export function createCatalogRouter(deps: AppDeps): Router {
  const router = Router();

  router.get(
    '/catalog/konks',
    asyncHandler(async (_req, res) => {
      const items = await deps.catalog.listKonks();
      res.status(200).json({ items });
    }),
  );

  router.get(
    '/catalog/konks/:name',
    asyncHandler(async (req, res) => {
      const item = await deps.catalog.getKonkByName(pathParam(req, 'name'));
      if (!item) throw new HttpError(404, 'konk_not_found');
      res.status(200).json(item);
    }),
  );

  router.post(
    '/catalog/konks',
    asyncHandler(async (req, res) => {
      const body = seedKonkRequestSchema.parse(req.body);
      const item = await deps.catalog.seedKonk({
        id: body.id ?? nextSeedId('konk'),
        name: body.name,
        title: body.title,
        url: body.url,
        imageUrl: body.imageUrl,
        recountDays: body.recountDays,
      });
      res.status(201).json(item);
    }),
  );

  router.get(
    '/catalog/prods',
    asyncHandler(async (_req, res) => {
      const items = await deps.catalog.listProds();
      res.status(200).json({ items });
    }),
  );

  router.get(
    '/catalog/prods/:name',
    asyncHandler(async (req, res) => {
      const item = await deps.catalog.getProdByName(pathParam(req, 'name'));
      if (!item) throw new HttpError(404, 'prod_not_found');
      res.status(200).json(item);
    }),
  );

  router.post(
    '/catalog/prods',
    asyncHandler(async (req, res) => {
      const body = seedProdRequestSchema.parse(req.body);
      const item = await deps.catalog.seedProd({
        id: body.id ?? nextSeedId('prod'),
        name: body.name,
        title: body.title,
        imageUrl: body.imageUrl,
      });
      res.status(201).json(item);
    }),
  );

  router.get(
    '/catalog/skus',
    asyncHandler(async (req, res) => {
      const filter: { konkName?: string; isInvalid?: boolean } = {};
      if (typeof req.query.konkName === 'string') filter.konkName = req.query.konkName;
      if (typeof req.query.isInvalid === 'string') {
        filter.isInvalid = req.query.isInvalid === 'true';
      }
      const items = await deps.catalog.listSkus(
        Object.keys(filter).length > 0 ? filter : undefined,
      );
      res.status(200).json({ items });
    }),
  );

  router.get(
    '/catalog/skus/:id',
    asyncHandler(async (req, res) => {
      const item = await deps.catalog.getSkuById(pathParam(req, 'id'));
      if (!item) throw new HttpError(404, 'sku_not_found');
      res.status(200).json(item);
    }),
  );

  router.post(
    '/catalog/skus',
    asyncHandler(async (req, res) => {
      const body = seedSkuRequestSchema.parse(req.body);
      const item = await deps.catalog.seedSku({
        id: body.id ?? nextSeedId('sku'),
        konkName: body.konkName,
        prodName: body.prodName,
        productId: body.productId,
        artikul: body.artikul,
        title: body.title,
        url: body.url,
        imageUrl: body.imageUrl,
        isInvalid: body.isInvalid,
      });
      res.status(201).json(item);
    }),
  );

  router.get(
    '/catalog/skugrs',
    asyncHandler(async (req, res) => {
      const filter: { konkName?: string; isSliced?: boolean } = {};
      if (typeof req.query.konkName === 'string') filter.konkName = req.query.konkName;
      if (typeof req.query.isSliced === 'string') {
        filter.isSliced = req.query.isSliced === 'true';
      }
      const items = await deps.catalog.listSkugrs(
        Object.keys(filter).length > 0 ? filter : undefined,
      );
      res.status(200).json({ items });
    }),
  );

  router.get(
    '/catalog/skugrs/:id',
    asyncHandler(async (req, res) => {
      const item = await deps.catalog.getSkugrById(pathParam(req, 'id'));
      if (!item) throw new HttpError(404, 'skugr_not_found');
      res.status(200).json(item);
    }),
  );

  router.post(
    '/catalog/skugrs',
    asyncHandler(async (req, res) => {
      const body = seedSkugrRequestSchema.parse(req.body);
      const item = await deps.catalog.seedSkugr({
        id: body.id ?? nextSeedId('skugr'),
        konkName: body.konkName,
        prodName: body.prodName,
        title: body.title,
        url: body.url,
        isSliced: body.isSliced,
        skuIds: body.skuIds,
      });
      res.status(201).json(item);
    }),
  );

  router.get(
    '/catalog/stock-bands',
    asyncHandler(async (req, res) => {
      const filter =
        typeof req.query.konkName === 'string' ? { konkName: req.query.konkName } : undefined;
      const items = await deps.catalog.listStockBands(filter);
      res.status(200).json({ items });
    }),
  );

  router.post(
    '/catalog/stock-bands/discover',
    asyncHandler(async (req, res) => {
      const body = stockBandDiscoverRequestSchema.parse(req.body);
      const band = await deps.catalog.getStockBandById(body.bandId);
      if (!band) throw new HttpError(404, 'stock_band_not_found');
      const result = await discoverStockBand({
        band,
        productIds: body.productIds,
        dateFrom: parseWireDate(body.dateFrom),
        dateTo: parseWireDate(body.dateTo),
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
    '/catalog/stock-bands/batch-correct',
    asyncHandler(async (req, res) => {
      const body = stockBandBatchCorrectRequestSchema.parse(req.body);
      const band = await deps.catalog.getStockBandById(body.bandId);
      if (!band) throw new HttpError(404, 'stock_band_not_found');
      const job = deps.sliceJobs.create({
        kind: 'stock-band.batch-correct',
        bandId: body.bandId,
        productIds: body.productIds,
        dateFrom: parseWireDate(body.dateFrom),
        dateTo: parseWireDate(body.dateTo),
      });
      res.status(202).json(serializeSliceJob(job));
    }),
  );

  router.get(
    '/catalog/stock-bands/:id',
    asyncHandler(async (req, res) => {
      const item = await deps.catalog.getStockBandById(pathParam(req, 'id'));
      if (!item) throw new HttpError(404, 'stock_band_not_found');
      res.status(200).json(item);
    }),
  );

  router.post(
    '/catalog/stock-bands',
    asyncHandler(async (req, res) => {
      const body = seedStockBandRequestSchema.parse(req.body);
      const item = await deps.catalog.seedStockBand({
        id: body.id ?? nextSeedId('band'),
        konk: body.konk,
        stockMin: body.stockMin,
        stockMax: body.stockMax,
        normalMax: body.normalMax,
      });
      res.status(201).json(item);
    }),
  );

  router.put(
    '/catalog/stock-bands/:id',
    asyncHandler(async (req, res) => {
      const body = updateStockBandRequestSchema.parse(req.body);
      if (body.id !== pathParam(req, 'id')) throw new HttpError(400, 'id_mismatch');
      const existing = await deps.catalog.getStockBandById(body.id);
      if (!existing) throw new HttpError(404, 'stock_band_not_found');
      const item = await deps.catalog.updateStockBand(body);
      res.status(200).json(item);
    }),
  );

  router.delete(
    '/catalog/stock-bands/:id',
    asyncHandler(async (req, res) => {
      const ok = await deps.catalog.deleteStockBand(pathParam(req, 'id'));
      if (!ok) throw new HttpError(404, 'stock_band_not_found');
      res.status(200).json({ ok: true as const });
    }),
  );

  return router;
}
