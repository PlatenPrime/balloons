import { toSliceDate } from '@balloons/domain';

/** Parse wire date (`YYYY-MM-DD` or ISO) to slice-day UTC midnight. */
export function parseWireDate(value: string): Date {
  const raw = value.includes('T') ? value : `${value}T00:00:00.000Z`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return toSliceDate(d);
}

export function toWireDate(date: Date): string {
  return toSliceDate(date).toISOString();
}

export function toWireInstant(date: Date): string {
  return date.toISOString();
}
