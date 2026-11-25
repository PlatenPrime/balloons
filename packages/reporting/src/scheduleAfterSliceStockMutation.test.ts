import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureScheduleMaterialize,
  flushScheduledMaterialize,
  scheduleAfterSliceStockMutation,
} from './scheduleAfterSliceStockMutation.js';

describe('scheduleAfterSliceStockMutation', () => {
  afterEach(() => {
    configureScheduleMaterialize({ reset: true, deps: null, runner: null });
  });

  it('re-runs when dirty is set while running (trailing coalesce)', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;

    const runner = vi.fn(async () => {
      calls += 1;
      if (calls === 1) await firstGate;
      return {
        konkName: 'air',
        daysTouched: [] as string[],
        keysUpdated: 0,
        rollupDocs: 0,
      };
    });
    configureScheduleMaterialize({ runner, reset: true });

    const day = new Date('2026-07-15T00:00:00.000Z');
    scheduleAfterSliceStockMutation({ konkName: 'air', dayD: day });

    await vi.waitFor(() => expect(runner).toHaveBeenCalledTimes(1));

    scheduleAfterSliceStockMutation({ konkName: 'air', dayD: day });
    releaseFirst();

    await flushScheduledMaterialize();
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('flushScheduledMaterialize waits until slots are idle', async () => {
    const runner = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return {
        konkName: 'air',
        daysTouched: [] as string[],
        keysUpdated: 0,
        rollupDocs: 0,
      };
    });
    configureScheduleMaterialize({ runner, reset: true });

    scheduleAfterSliceStockMutation({
      konkName: 'air',
      dayD: new Date('2026-07-15T00:00:00.000Z'),
    });
    scheduleAfterSliceStockMutation({
      konkName: 'balun',
      dayD: new Date('2026-07-15T00:00:00.000Z'),
    });

    await flushScheduledMaterialize();
    expect(runner).toHaveBeenCalledTimes(2);
  });
});
