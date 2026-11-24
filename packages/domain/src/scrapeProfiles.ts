export type ScrapeRunKind = 'skuSlice' | 'groupPagesFill' | 'groupPagesPage';

export type JitterRange = {
  minMs: number;
  maxMs: number;
};

export type TierPauseConfig = {
  every: number;
  pauseMinMs: number;
  pauseMaxMs: number;
};

export type ChunkConfig = {
  maxFetches: number;
  interChunkPauseMinMs: number;
  interChunkPauseMaxMs: number;
};

/** Per-konk scrape throttle / abort knobs for slice runs. */
export type ScrapeProfile = {
  requestJitter: JitterRange;
  cluster?: TierPauseConfig;
  block?: TierPauseConfig;
  chunk?: ChunkConfig;
  consecutiveInvalidAbort?: number;
};

export const DEFAULT_SKU_SLICE_REQUEST_JITTER: JitterRange = {
  minMs: 500,
  maxMs: 1500,
};

export const DEFAULT_SCRAPE_PROFILES: Readonly<Record<ScrapeRunKind, ScrapeProfile>> = {
  skuSlice: {
    requestJitter: DEFAULT_SKU_SLICE_REQUEST_JITTER,
  },
  groupPagesFill: {
    requestJitter: { minMs: 0, maxMs: 0 },
  },
  groupPagesPage: {
    requestJitter: { minMs: 800, maxMs: 1600 },
  },
};

/** Zero-delay profile for fixture / unit tests. */
export const SAMPLE_SKU_SLICE_PROFILE: ScrapeProfile = {
  requestJitter: { minMs: 0, maxMs: 0 },
  consecutiveInvalidAbort: 15,
};

const COMPETITOR_SCRAPE_PROFILE_OVERRIDES: Readonly<
  Record<string, Partial<Record<ScrapeRunKind, ScrapeProfile>>>
> = {
  _sample: {
    skuSlice: SAMPLE_SKU_SLICE_PROFILE,
  },
  air: {
    skuSlice: {
      requestJitter: { minMs: 2000, maxMs: 5000 },
      cluster: { every: 10, pauseMinMs: 20_000, pauseMaxMs: 40_000 },
      block: {
        every: 100,
        pauseMinMs: 4 * 60 * 1000,
        pauseMaxMs: 6 * 60 * 1000,
      },
      chunk: {
        maxFetches: 1000,
        interChunkPauseMinMs: 45 * 60 * 1000,
        interChunkPauseMaxMs: 60 * 60 * 1000,
      },
      consecutiveInvalidAbort: 15,
    },
  },
};

function normalizeKonkName(konkName: string): string {
  return konkName.trim().toLowerCase();
}

function mergeProfile(base: ScrapeProfile, override?: ScrapeProfile): ScrapeProfile {
  if (!override) {
    return base;
  }
  const merged: ScrapeProfile = {
    requestJitter: override.requestJitter ?? base.requestJitter,
  };
  const cluster = override.cluster ?? base.cluster;
  if (cluster !== undefined) merged.cluster = cluster;
  const block = override.block ?? base.block;
  if (block !== undefined) merged.block = block;
  const chunk = override.chunk ?? base.chunk;
  if (chunk !== undefined) merged.chunk = chunk;
  const consecutiveInvalidAbort = override.consecutiveInvalidAbort ?? base.consecutiveInvalidAbort;
  if (consecutiveInvalidAbort !== undefined) {
    merged.consecutiveInvalidAbort = consecutiveInvalidAbort;
  }
  return merged;
}

export function resolveScrapeProfile(konkName: string, runKind: ScrapeRunKind): ScrapeProfile {
  const key = normalizeKonkName(konkName);
  const base = DEFAULT_SCRAPE_PROFILES[runKind];
  const override = COMPETITOR_SCRAPE_PROFILE_OVERRIDES[key]?.[runKind];
  return mergeProfile(base, override);
}

/** Pick a delay within `[minMs, maxMs]` (inclusive). Deterministic when min === max. */
export function jitterMs(minMs: number, maxMs: number, random: () => number = Math.random): number {
  const lo = Math.min(minMs, maxMs);
  const hi = Math.max(minMs, maxMs);
  if (lo === hi) {
    return lo;
  }
  return Math.floor(lo + random() * (hi - lo + 1));
}
