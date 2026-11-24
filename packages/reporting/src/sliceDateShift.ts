import { toSliceDate } from '@balloons/domain';

/** Previous calendar slice-day key (UTC day as stored). */
export function sliceDateMinusDays(sliceDate: Date, days: number): Date {
  const d = toSliceDate(sliceDate);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/** Next calendar slice-day key (UTC day as stored). */
export function sliceDatePlusDays(sliceDate: Date, days: number): Date {
  return sliceDateMinusDays(sliceDate, -days);
}

/** Inclusive list of slice-day keys from `from` to `to`. */
export function enumerateSliceDates(from: Date, to: Date): Date[] {
  const start = toSliceDate(from);
  const end = toSliceDate(to);
  const out: Date[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime(); d = sliceDatePlusDays(d, 1)) {
    out.push(new Date(d));
  }
  return out;
}
