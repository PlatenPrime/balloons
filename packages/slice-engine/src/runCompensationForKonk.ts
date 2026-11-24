import { toSliceDate } from '@balloons/domain';
import { runSliceForKonk } from './runSliceForKonk.js';
import type { RunSliceResult, SliceEngineDeps } from './types.js';

export type RunCompensationForKonkInput = {
  konk: string;
  /** Calendar slice day (same-day key). Defaults to `toSliceDate(now)`. */
  day?: Date;
  now?: Date;
  deps: SliceEngineDeps;
  signal?: AbortSignal;
};

/**
 * Re-run only invalid / missing points for a calendar day (`sliceDate` scenario `calendar`).
 * Already-valid points are skipped by `runSliceForKonk`.
 */
export async function runCompensationForKonk(
  input: RunCompensationForKonkInput,
): Promise<RunSliceResult> {
  const day = toSliceDate(input.day ?? input.now ?? new Date());
  return runSliceForKonk({
    konk: input.konk,
    day,
    deps: input.deps,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}
