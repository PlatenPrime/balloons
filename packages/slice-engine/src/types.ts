import type {
  CatalogStore,
  PageSource,
  ScrapeProfile,
  ScrapeRunKind,
  SliceStore,
} from '@balloons/domain';

export type DelayFn = (ms: number) => Promise<void>;

export type SliceEngineDeps = {
  catalog: CatalogStore;
  slices: SliceStore;
  pageSource: PageSource;
  /** Defaults to `resolveScrapeProfile`. */
  getScrapeProfile?: (konk: string, kind: ScrapeRunKind) => ScrapeProfile;
  /** Defaults to real timer; tests inject no-op. */
  delay?: DelayFn;
};

export type SliceAbortReason = 'consecutive_invalid' | 'unsupported' | 'origin_blocked' | 'aborted';

export type RunSliceResult = {
  konkName: string;
  day: Date;
  filled: number;
  invalid: number;
  errorCount: number;
  dueTotal: number;
  skippedValid: number;
  abortReason?: SliceAbortReason;
};
