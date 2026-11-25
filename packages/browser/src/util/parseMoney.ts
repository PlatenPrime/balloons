/** Parse first money-like number from text (comma or dot decimal). */
export function parseMoney(text: string | undefined | null): number | undefined {
  if (!text) {
    return undefined;
  }
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/-?\d[\d\s]*(?:[.,]\d+)?/);
  if (!match) {
    return undefined;
  }
  const normalized = match[0].replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

export function roundMoney(value: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
