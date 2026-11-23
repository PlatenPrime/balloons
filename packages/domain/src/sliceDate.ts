/** Calendar day for slices: Europe/Kiev (same as crons / business logic). */
const SLICE_TIMEZONE = 'Europe/Kiev';

/** From this Kyiv hour the next calendar day's slice is open (like cron `0 0 20`). */
const SLICE_OPEN_HOUR = 20;

export type SliceDateScenario = 'calendar' | 'next' | 'open';

const kyivCalendarPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SLICE_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const kyivHourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SLICE_TIMEZONE,
  hour: 'numeric',
  hourCycle: 'h23',
});

function formatKyivYmd(d: Date): string {
  const parts = kyivCalendarPartsFormatter.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !day) {
    throw new Error('toSliceDate: could not read calendar date in Europe/Kiev');
  }
  return `${y}-${m}-${day}`;
}

/**
 * Slice day key: calendar date by Kyiv wall clock, stored as `YYYY-MM-DDT00:00:00.000Z`.
 * Named scenario: `calendar` (compensation / same-day key).
 */
export function toSliceDate(d: Date): Date {
  const ymd = formatKyivYmd(d);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * Next Kyiv calendar day key (evening cron: same date `toSliceDate` would give at midnight).
 * Named scenario: `next`.
 */
export function toNextKyivSliceDate(d: Date): Date {
  const ymd = formatKyivYmd(d);
  const [yStr, mStr, dStr] = ymd.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const day = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
    throw new Error('toNextKyivSliceDate: invalid YMD from Europe/Kiev');
  }
  const next = new Date(Date.UTC(y, m - 1, day + 1));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return new Date(`${yy}-${mm}-${dd}T00:00:00.000Z`);
}

function kyivHour(d: Date): number {
  const hourPart = kyivHourFormatter.formatToParts(d).find((p) => p.type === 'hour');
  const hour = Number(hourPart?.value);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    throw new Error('toOpenKyivSliceDate: could not read hour in Europe/Kiev');
  }
  return hour;
}

/**
 * Slice key that can be run now: from 20:00 Kyiv → next day, before → today.
 * Named scenario: `open` (client-open / interactive).
 */
export function toOpenKyivSliceDate(d: Date): Date {
  if (kyivHour(d) >= SLICE_OPEN_HOUR) {
    return toNextKyivSliceDate(d);
  }
  return toSliceDate(d);
}

/**
 * Named scenarios: `calendar` (compensation), `next` (evening cron), `open` (client-open).
 */
export function sliceDateForScenario(scenario: SliceDateScenario, d: Date): Date {
  switch (scenario) {
    case 'calendar':
      return toSliceDate(d);
    case 'next':
      return toNextKyivSliceDate(d);
    case 'open':
      return toOpenKyivSliceDate(d);
  }
}
