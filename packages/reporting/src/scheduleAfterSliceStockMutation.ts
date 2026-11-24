import {
  toSliceDate,
  type OnSliceStockMutated,
  type SliceStockMutatedEvent,
} from '@balloons/domain';
import {
  materializeManufacturerDaySales,
  type MaterializeDeps,
  type MaterializeResult,
} from './materialize.js';

export type ScheduleAfterSliceStockMutationParams = {
  konkName: string;
  dayD: Date;
};

type MutationRunner = (params: ScheduleAfterSliceStockMutationParams) => Promise<MaterializeResult>;

type Slot = {
  dirty: boolean;
  running: boolean;
  runPromise: Promise<void> | null;
};

const slots = new Map<string, Slot>();

let mutationRunner: MutationRunner | null = null;
let defaultDeps: MaterializeDeps | null = null;

function slotKey(konkName: string, dayD: Date): string {
  const day = toSliceDate(dayD).toISOString().slice(0, 10);
  return `${konkName.trim().toLowerCase()}|${day}`;
}

function parseSlotKey(key: string): ScheduleAfterSliceStockMutationParams {
  const sep = key.indexOf('|');
  const konkName = key.slice(0, sep);
  const day = key.slice(sep + 1);
  return {
    konkName,
    dayD: new Date(`${day}T00:00:00.000Z`),
  };
}

async function defaultRunner(
  params: ScheduleAfterSliceStockMutationParams,
): Promise<MaterializeResult> {
  if (!defaultDeps) {
    throw new Error('scheduleAfterSliceStockMutation: deps not configured');
  }
  return materializeManufacturerDaySales({
    deps: defaultDeps,
    konkName: params.konkName,
    dayD: params.dayD,
  });
}

async function pump(key: string): Promise<void> {
  const slot = slots.get(key);
  if (!slot || slot.running || !slot.dirty) return;

  slot.running = true;
  slot.dirty = false;
  const params = parseSlotKey(key);
  const runner = mutationRunner ?? defaultRunner;

  slot.runPromise = (async () => {
    try {
      await runner(params);
    } finally {
      slot.running = false;
      slot.runPromise = null;
      if (slot.dirty) {
        void pump(key);
      } else {
        slots.delete(key);
      }
    }
  })();

  await slot.runPromise;
}

/**
 * Non-blocking hook after stock mutation: marks (konk, day) dirty and runs
 * one full rematerialize with trailing coalesce.
 */
export function scheduleAfterSliceStockMutation(
  params: ScheduleAfterSliceStockMutationParams,
): void {
  const konkName = params.konkName.trim();
  if (!konkName) return;

  const key = slotKey(konkName, params.dayD);
  let slot = slots.get(key);
  if (!slot) {
    slot = { dirty: false, running: false, runPromise: null };
    slots.set(key, slot);
  }
  slot.dirty = true;
  void pump(key);
}

/** Await all scheduled rematerialize runs (tests). */
export async function flushScheduledMaterialize(): Promise<void> {
  for (;;) {
    const pending = [...slots.values()]
      .map((s) => s.runPromise)
      .filter((p): p is Promise<void> => p != null);
    if (pending.length === 0) {
      // Allow a microtask for newly scheduled pumps.
      await Promise.resolve();
      const still = [...slots.values()].some((s) => s.dirty || s.running || s.runPromise);
      if (!still) return;
      continue;
    }
    await Promise.all(pending);
  }
}

/** Test helper: inject runner / reset slots. */
export function configureScheduleMaterialize(options: {
  deps?: MaterializeDeps | null;
  runner?: MutationRunner | null;
  reset?: boolean;
}): void {
  if (options.deps !== undefined) defaultDeps = options.deps;
  if (options.runner !== undefined) mutationRunner = options.runner;
  if (options.reset) slots.clear();
}

/**
 * Factory for `createInMemorySliceStore({ onSliceStockMutated })`.
 * Returns immediately (void); rematerialize is coalesced per (konk, day).
 */
export function createMaterializeOnSliceStockMutated(deps: MaterializeDeps): OnSliceStockMutated {
  defaultDeps = deps;
  return (event: SliceStockMutatedEvent) => {
    scheduleAfterSliceStockMutation({
      konkName: event.konkName,
      dayD: event.day,
    });
  };
}
