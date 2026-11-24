import { describe, expect, it } from 'vitest';
import { jitterMs, resolveScrapeProfile } from './scrapeProfiles.js';

describe('scrapeProfiles', () => {
  it('resolves zero-delay profile for _sample skuSlice', () => {
    const profile = resolveScrapeProfile('_sample', 'skuSlice');
    expect(profile.requestJitter).toEqual({ minMs: 0, maxMs: 0 });
    expect(profile.consecutiveInvalidAbort).toBe(15);
  });

  it('falls back to default jitter for unknown konk', () => {
    const profile = resolveScrapeProfile('unknown', 'skuSlice');
    expect(profile.requestJitter).toEqual({ minMs: 500, maxMs: 1500 });
    expect(profile.consecutiveInvalidAbort).toBeUndefined();
  });

  it('jitterMs is deterministic when min equals max', () => {
    expect(jitterMs(0, 0)).toBe(0);
    expect(jitterMs(12, 12, () => 0.99)).toBe(12);
  });
});
