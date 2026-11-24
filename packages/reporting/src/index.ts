export {
  applyRecountDayToSales,
  computePersistedDaySales,
  computeRevenueForDay,
  computeSalesFromStockSequence,
  computeSharePercent,
  isRedFlagSliceStock,
  toMetricForPersistedSales,
  toUtcDateKey,
  type DaySalesResult,
  type PersistedDaySales,
} from './salesMath.js';

export {
  coalesceSlicePointsAlongDates,
  type ReportingCarry,
  type ReportingCoalescedPoint,
} from './coalescePoints.js';

export { enumerateSliceDates, sliceDateMinusDays, sliceDatePlusDays } from './sliceDateShift.js';

export {
  materializeManufacturerDaySales,
  materializeManufacturerDaySalesDateRange,
  type MaterializeDeps,
  type MaterializeResult,
} from './materialize.js';

export {
  configureScheduleMaterialize,
  createMaterializeOnSliceStockMutated,
  flushScheduledMaterialize,
  scheduleAfterSliceStockMutation,
  type ScheduleAfterSliceStockMutationParams,
} from './scheduleAfterSliceStockMutation.js';

export {
  resolveKonkProdSkus,
  resolveSelectionSkus,
  resolveSkugrWithSkus,
  resolveSkusByIds,
  type ResolveKonkProdSkusParams,
  type SelectionResolveParams,
} from './resolveSkus.js';

export {
  aggregateDailyStockForSkus,
  aggregatePeriodTotalsForSkus,
  aggregateSkuByDate,
  aggregateSkuDayMetrics,
  aggregateSkuRange,
  salesFromCoalescedStockSequence,
  type PeriodSkuTotals,
  type SkuDayMetric,
} from './aggregates/skuMetrics.js';

export {
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
  type ChartDayRow,
  type SalesPcsUah,
} from './aggregates/reports.js';

export {
  EXCEL_SKU_KINDS,
  isExcelSkuKind,
  type ExcelBuildRequest,
  type ExcelJobParams,
  type ExcelSkuKind,
} from './excel/kinds.js';

export {
  buildExcelSnapshot,
  pointMapFromSnapshot,
  type ExcelSlicePointRow,
  type ExcelSnapshot,
} from './excel/snapshot.js';

export { buildExcelFromSnapshot, type ExcelBuildResult } from './excel/builders.js';

export {
  createExcelJobQueue,
  type ExcelJob,
  type ExcelJobPayload,
  type ExcelJobQueue,
  type ExcelJobQueueDeps,
  type ExcelJobStatus,
} from './excel/excelJobs.js';
