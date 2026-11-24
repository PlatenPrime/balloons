import {
  decidePackFlipPatchesForSeries,
  toSliceDate,
  type PackFlipSeriesDecision,
  type SlicePoint,
  type SliceStore,
} from '@balloons/domain';

export type PackFlipDayPoint = {
  date: Date;
  point: SlicePoint | null;
};

export type PackFlipPreviewItem = {
  productId: string;
  decisions: PackFlipSeriesDecision[];
};

export type PackFlipPreviewResult = {
  konkName: string;
  items: PackFlipPreviewItem[];
};

export type PackFlipApplyResult = {
  konkName: string;
  applied: number;
  skipped: number;
};

function addUtcDays(date: Date, days: number): Date {
  const d = toSliceDate(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

function enumerateDates(from: Date, to: Date): Date[] {
  const start = toSliceDate(from);
  const end = toSliceDate(to);
  const out: Date[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addUtcDays(d, 1)) {
    out.push(d);
  }
  return out;
}

async function loadSeries(
  slices: SliceStore,
  konkName: string,
  productId: string,
  dates: Date[],
): Promise<PackFlipDayPoint[]> {
  const out: PackFlipDayPoint[] = [];
  for (const date of dates) {
    const point = await slices.getPoint(konkName, productId, date);
    out.push({ date, point });
  }
  return out;
}

/**
 * Preview pack-flip patches for product series over `[dateFrom, dateTo]`.
 */
export async function previewPackFlips(input: {
  konk: string;
  productIds: string[];
  dateFrom: Date;
  dateTo: Date;
  slices: SliceStore;
}): Promise<PackFlipPreviewResult> {
  const dates = enumerateDates(input.dateFrom, input.dateTo);
  const items: PackFlipPreviewItem[] = [];

  for (const productId of input.productIds) {
    const series = await loadSeries(input.slices, input.konk, productId, dates);
    const decisions = decidePackFlipPatchesForSeries(
      series.map((d) => ({ dateMs: d.date.getTime(), point: d.point })),
    );
    if (decisions.length === 0) continue;
    items.push({ productId, decisions });
  }

  return { konkName: input.konk, items };
}

/**
 * Apply inverse pack-flip patches that include a `patched` point.
 */
export async function applyPackFlips(input: {
  konk: string;
  productIds: string[];
  dateFrom: Date;
  dateTo: Date;
  slices: SliceStore;
}): Promise<PackFlipApplyResult> {
  const preview = await previewPackFlips(input);
  const dates = enumerateDates(input.dateFrom, input.dateTo);
  let applied = 0;
  let skipped = 0;

  for (const item of preview.items) {
    for (const decision of item.decisions) {
      if (decision.kind !== 'inverse' || !decision.patched) {
        skipped += 1;
        continue;
      }
      const date = dates[decision.index];
      if (!date) {
        skipped += 1;
        continue;
      }
      await input.slices.upsertPoint({
        konkName: input.konk,
        productId: item.productId,
        date,
        point: decision.patched,
      });
      applied += 1;
    }
  }

  return { konkName: input.konk, applied, skipped };
}
