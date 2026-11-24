import { parseSkuPage } from '@balloons/browser';
import {
  isInvalidSlicePoint,
  isValidSliceMetricValue,
  jitterMs,
  resolveScrapeProfile,
  toSliceDate,
  type SliceDayRunStats,
  type SlicePoint,
} from '@balloons/domain';
import { defaultDelay } from './delay.js';
import { loadSlicedSkusForKonk } from './loadSlicedSkus.js';
import type { RunSliceResult, SliceAbortReason, SliceEngineDeps } from './types.js';

export type RunSliceForKonkInput = {
  konk: string;
  day: Date;
  deps: SliceEngineDeps;
  signal?: AbortSignal;
};

const SOFT_FAIL_POINT: SlicePoint = { stock: -1, price: -1 };

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('Slice run aborted');
    err.name = 'AbortError';
    throw err;
  }
}

function toValidPoint(stock: unknown, price: unknown): SlicePoint | null {
  if (!isValidSliceMetricValue(stock) || !isValidSliceMetricValue(price)) {
    return null;
  }
  return { stock, price };
}

/**
 * Catalog → urls → PageSource → parser → SliceStore for one konk day.
 * Skips already-valid points; writes `{-1,-1}` on soft-fail; aborts on consecutive invalid.
 */
export async function runSliceForKonk(input: RunSliceForKonkInput): Promise<RunSliceResult> {
  const { konk, deps, signal } = input;
  const day = toSliceDate(input.day);
  const getProfile = deps.getScrapeProfile ?? resolveScrapeProfile;
  const delay = deps.delay ?? defaultDelay;
  const profile = getProfile(konk, 'skuSlice');
  const abortAfter = profile.consecutiveInvalidAbort ?? Number.POSITIVE_INFINITY;

  const skus = await loadSlicedSkusForKonk(deps.catalog, konk);
  const dueTotal = skus.length;

  let filled = 0;
  let invalid = 0;
  let errorCount = 0;
  let skippedValid = 0;
  let consecutiveInvalid = 0;
  let abortReason: SliceAbortReason | undefined;

  for (let i = 0; i < skus.length; i++) {
    throwIfAborted(signal);
    const sku = skus[i]!;

    const existing = await deps.slices.getPoint(konk, sku.productId, day);
    if (!isInvalidSlicePoint(existing)) {
      skippedValid += 1;
      consecutiveInvalid = 0;
      continue;
    }

    try {
      const html = await deps.pageSource.getSkuPageHtml(konk, sku.url);
      const parsed = parseSkuPage(html, {
        konk,
        url: sku.url,
        productId: sku.productId,
      });
      const point = toValidPoint(parsed.stock, parsed.price);
      if (!point) {
        await deps.slices.upsertPoint({
          konkName: konk,
          productId: sku.productId,
          date: day,
          point: SOFT_FAIL_POINT,
        });
        invalid += 1;
        consecutiveInvalid += 1;
      } else {
        await deps.slices.upsertPoint({
          konkName: konk,
          productId: sku.productId,
          date: day,
          point,
        });
        filled += 1;
        consecutiveInvalid = 0;
      }
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'ORIGIN_BLOCKED') {
        abortReason = 'origin_blocked';
        errorCount += 1;
        break;
      }
      if (code === 'UNSUPPORTED_KONK') {
        abortReason = 'unsupported';
        errorCount += 1;
        break;
      }

      await deps.slices.upsertPoint({
        konkName: konk,
        productId: sku.productId,
        date: day,
        point: SOFT_FAIL_POINT,
      });
      invalid += 1;
      errorCount += 1;
      consecutiveInvalid += 1;
    }

    if (consecutiveInvalid >= abortAfter) {
      abortReason = 'consecutive_invalid';
      break;
    }

    if (i < skus.length - 1) {
      const wait = jitterMs(profile.requestJitter.minMs, profile.requestJitter.maxMs);
      await delay(wait);
    }
  }

  const stats: SliceDayRunStats = {
    filled,
    invalid,
    errorCount,
    dueTotal,
  };
  if (abortReason) {
    stats.abortReason = abortReason;
  }

  await deps.slices.upsertDayMeta({
    konkName: konk,
    date: day,
    stats,
  });

  const result: RunSliceResult = {
    konkName: konk,
    day,
    filled,
    invalid,
    errorCount,
    dueTotal,
    skippedValid,
  };
  if (abortReason) {
    result.abortReason = abortReason;
  }
  return result;
}
