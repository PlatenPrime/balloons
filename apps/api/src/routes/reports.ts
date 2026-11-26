import {
  reportKonkProdQuerySchema,
  reportManufacturersPieQuerySchema,
  reportProdKonksPieQuerySchema,
  reportSelectionPieQuerySchema,
  reportSkuByDateQuerySchema,
  reportSkuRangeQuerySchema,
  reportSkugrQuerySchema,
} from '@balloons/web-api-client';
import {
  reportKonkProdSalesSeries,
  reportKonkProdSkugrGroupsSales,
  reportKonkProdStockSeries,
  reportManufacturersPie,
  reportProdKonksPie,
  reportSelectionSkusPie,
  reportSkuByDate,
  reportSkuRange,
  reportSkugrDailySummary,
  reportSkugrSkusSales,
} from '@balloons/reporting';
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { parseWireDate } from '../http/dates.js';
import { asyncHandler } from '../http/errors.js';

function splitCsv(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function createReportsRouter(deps: AppDeps): Router {
  const router = Router();
  const stores = {
    catalog: deps.catalog,
    slices: deps.slices,
    sales: deps.sales,
  };

  router.get(
    '/reports/sku-by-date',
    asyncHandler(async (req, res) => {
      const query = reportSkuByDateQuerySchema.parse(req.query);
      const result = await reportSkuByDate({
        ...stores,
        skuId: query.skuId,
        date: parseWireDate(query.date),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/sku-range',
    asyncHandler(async (req, res) => {
      const query = reportSkuRangeQuerySchema.parse(req.query);
      const result = await reportSkuRange({
        ...stores,
        skuId: query.skuId,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/skugr-daily',
    asyncHandler(async (req, res) => {
      const query = reportSkugrQuerySchema.parse(req.query);
      const result = await reportSkugrDailySummary({
        ...stores,
        skugrId: query.skugrId,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/skugr-skus-sales',
    asyncHandler(async (req, res) => {
      const query = reportSkugrQuerySchema.parse(req.query);
      const result = await reportSkugrSkusSales({
        ...stores,
        skugrId: query.skugrId,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/konk-prod-groups',
    asyncHandler(async (req, res) => {
      const query = reportKonkProdQuerySchema.parse(req.query);
      const result = await reportKonkProdSkugrGroupsSales({
        ...stores,
        konk: query.konk,
        prod: query.prod,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/stock-series',
    asyncHandler(async (req, res) => {
      const query = reportKonkProdQuerySchema.parse(req.query);
      const skugrIds = splitCsv(query.skugrIds);
      const result = await reportKonkProdStockSeries({
        ...stores,
        konk: query.konk,
        prod: query.prod,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
        ...(skugrIds ? { skugrIds } : {}),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/sales-series',
    asyncHandler(async (req, res) => {
      const query = reportKonkProdQuerySchema.parse(req.query);
      const skugrIds = splitCsv(query.skugrIds);
      const result = await reportKonkProdSalesSeries({
        ...stores,
        konk: query.konk,
        prod: query.prod,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
        ...(skugrIds ? { skugrIds } : {}),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/manufacturers-pie',
    asyncHandler(async (req, res) => {
      const query = reportManufacturersPieQuerySchema.parse(req.query);
      const result = await reportManufacturersPie({
        catalog: deps.catalog,
        sales: deps.sales,
        konk: query.konk,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/prod-konks-pie',
    asyncHandler(async (req, res) => {
      const query = reportProdKonksPieQuerySchema.parse(req.query);
      const excludeKonks = splitCsv(query.excludeKonks);
      const result = await reportProdKonksPie({
        catalog: deps.catalog,
        sales: deps.sales,
        prod: query.prod,
        dateFrom: parseWireDate(query.dateFrom),
        dateTo: parseWireDate(query.dateTo),
        ...(excludeKonks ? { excludeKonks } : {}),
      });
      res.status(200).json(result);
    }),
  );

  router.get(
    '/reports/selection-pie',
    asyncHandler(async (req, res) => {
      const query = reportSelectionPieQuerySchema.parse(req.query);
      const dateFrom = parseWireDate(query.dateFrom);
      const dateTo = parseWireDate(query.dateTo);
      const selectAll = query.selectAll === 'true' || query.selectAll === '1';
      const result = selectAll
        ? await reportSelectionSkusPie({
            catalog: deps.catalog,
            slices: deps.slices,
            dateFrom,
            dateTo,
            selectAll: true,
            ...(query.search !== undefined ? { search: query.search } : {}),
            ...(query.konkName !== undefined ? { konkName: query.konkName } : {}),
            ...(query.prodName !== undefined ? { prodName: query.prodName } : {}),
          })
        : await reportSelectionSkusPie({
            catalog: deps.catalog,
            slices: deps.slices,
            dateFrom,
            dateTo,
            skuIds: splitCsv(query.skuIds) ?? [],
          });
      res.status(200).json(result);
    }),
  );

  return router;
}
