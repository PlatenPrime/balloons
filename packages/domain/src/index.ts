export type {
  Konk,
  Prod,
  Sku,
  Skugr,
  SlicePoint,
  SliceRotationMeta,
  SliceDayRunStats,
  SliceDayMeta,
  StockBandKonk,
  StockBand,
  SlicePointKey,
  ManufacturerDaySales,
} from './types.js';

export type {
  CatalogStore,
  UpsertSlicePointInput,
  UpsertSliceDayMetaInput,
  SliceStore,
  ManufacturerDaySalesStore,
  PageSource,
  SliceStockMutatedEvent,
  OnSliceStockMutated,
} from './ports.js';

export {
  toSliceDate,
  toNextKyivSliceDate,
  toOpenKyivSliceDate,
  sliceDateForScenario,
  type SliceDateScenario,
} from './sliceDate.js';

export {
  isValidSliceMetricValue,
  isFullMinusOneStockPrice,
  isFullMinusOneSlicePoint,
  isInvalidSlicePoint,
} from './invalid.js';

export {
  DEFAULT_SCRAPE_PROFILES,
  DEFAULT_SKU_SLICE_REQUEST_JITTER,
  SAMPLE_SKU_SLICE_PROFILE,
  jitterMs,
  resolveScrapeProfile,
  type ChunkConfig,
  type JitterRange,
  type ScrapeProfile,
  type ScrapeRunKind,
  type TierPauseConfig,
} from './scrapeProfiles.js';

export {
  PACK_FLIP_FACTOR_REL_TOL,
  PACK_FLIP_MIN_FACTOR,
  PACK_FLIP_STOCK_REL_TOL,
  PACK_FLIP_VALUE_REL_TOL,
  areSamePriceScale,
  decidePackFlipPatchesForSeries,
  detectInversePackFlip,
  detectPriceOnlyPackFlip,
  isUsablePackFlipPoint,
  nearestIntegerFactor,
  readPackFlipPoint,
  rescaleToNeighborScale,
  roundMoney,
  type InversePackFlip,
  type PackFlipSeriesDay,
  type PackFlipSeriesDecision,
  type PriceOnlyPackFlip,
} from './packFlipDetect.js';

export {
  fixtureManifestSchema,
  fixtureSlotSchema,
  parseFixtureManifest,
  safeParseFixtureManifest,
  type FixtureManifest,
  type FixtureSlot,
} from './fixtures/manifestSchema.js';
