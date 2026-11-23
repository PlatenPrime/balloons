import type {
  OnSliceStockMutated,
  SliceDayMeta,
  SlicePoint,
  SliceStore,
  UpsertSliceDayMetaInput,
  UpsertSlicePointInput,
} from '@balloons/domain';
import { toSliceDate } from '@balloons/domain';

function pointKey(konkName: string, productId: string, date: Date): string {
  return `${konkName}\0${productId}\0${toSliceDate(date).toISOString()}`;
}

function dayMetaKey(konkName: string, date: Date): string {
  return `${konkName}\0${toSliceDate(date).toISOString()}`;
}

export type InMemorySliceStoreOptions = {
  onSliceStockMutated?: OnSliceStockMutated;
};

export function createInMemorySliceStore(options: InMemorySliceStoreOptions = {}): SliceStore {
  const points = new Map<string, SlicePoint>();
  const dayMetas = new Map<string, SliceDayMeta>();
  const { onSliceStockMutated } = options;

  return {
    async getPoint(konkName, productId, date) {
      return points.get(pointKey(konkName, productId, date)) ?? null;
    },
    async upsertPoint(input: UpsertSlicePointInput) {
      const date = toSliceDate(input.date);
      const key = pointKey(input.konkName, input.productId, date);
      points.set(key, input.point);
      if (onSliceStockMutated) {
        await onSliceStockMutated({
          konkName: input.konkName,
          day: date,
          productId: input.productId,
        });
      }
      return input.point;
    },
    async listPointsForDay(konkName, date) {
      const dayIso = toSliceDate(date).toISOString();
      const prefix = `${konkName}\0`;
      const result: Array<{ productId: string; point: SlicePoint }> = [];
      for (const [key, point] of points) {
        if (!key.startsWith(prefix) || !key.endsWith(`\0${dayIso}`)) continue;
        const productId = key.slice(prefix.length, key.length - dayIso.length - 1);
        result.push({ productId, point });
      }
      return result;
    },
    async getDayMeta(konkName, date) {
      return dayMetas.get(dayMetaKey(konkName, date)) ?? null;
    },
    async upsertDayMeta(input: UpsertSliceDayMetaInput) {
      const date = toSliceDate(input.date);
      const key = dayMetaKey(input.konkName, date);
      const prev = dayMetas.get(key);
      const next: SliceDayMeta = {
        konkName: input.konkName,
        date,
      };

      if (input.rotationMeta === undefined) {
        if (prev?.rotationMeta !== undefined) next.rotationMeta = prev.rotationMeta;
      } else if (input.rotationMeta !== null) {
        next.rotationMeta = input.rotationMeta;
      }

      if (input.stats === undefined) {
        if (prev?.stats !== undefined) next.stats = prev.stats;
      } else if (input.stats !== null) {
        next.stats = input.stats;
      }

      dayMetas.set(key, next);
      return next;
    },
  };
}
