import type { ManufacturerDaySales, ManufacturerDaySalesStore } from '@balloons/domain';
import { toSliceDate } from '@balloons/domain';

function rowKey(konkName: string, date: Date, prodName: string): string {
  return `${konkName}\0${toSliceDate(date).toISOString()}\0${prodName}`;
}

function dayPrefix(konkName: string, date: Date): string {
  return `${konkName}\0${toSliceDate(date).toISOString()}\0`;
}

export function createInMemoryManufacturerDaySalesStore(): ManufacturerDaySalesStore {
  const rows = new Map<string, ManufacturerDaySales>();

  return {
    async replaceDay(konkName, date, nextRows) {
      const prefix = dayPrefix(konkName, date);
      for (const key of [...rows.keys()]) {
        if (key.startsWith(prefix)) rows.delete(key);
      }
      const day = toSliceDate(date);
      for (const row of nextRows) {
        rows.set(rowKey(konkName, day, row.prodName), {
          konkName,
          date: day,
          prodName: row.prodName,
          salesPcs: row.salesPcs,
          salesUah: row.salesUah,
        });
      }
    },

    async listByKonkDateRange(konkName, from, to) {
      const fromMs = toSliceDate(from).getTime();
      const toMs = toSliceDate(to).getTime();
      const prefix = `${konkName}\0`;
      const out: ManufacturerDaySales[] = [];
      for (const [key, row] of rows) {
        if (!key.startsWith(prefix)) continue;
        const t = row.date.getTime();
        if (t < fromMs || t > toMs) continue;
        out.push(row);
      }
      out.sort(
        (a, b) => a.date.getTime() - b.date.getTime() || a.prodName.localeCompare(b.prodName),
      );
      return out;
    },

    async listByProdDateRange(prodName, from, to) {
      const fromMs = toSliceDate(from).getTime();
      const toMs = toSliceDate(to).getTime();
      const out: ManufacturerDaySales[] = [];
      for (const row of rows.values()) {
        if (row.prodName !== prodName) continue;
        const t = row.date.getTime();
        if (t < fromMs || t > toMs) continue;
        out.push(row);
      }
      out.sort(
        (a, b) => a.date.getTime() - b.date.getTime() || a.konkName.localeCompare(b.konkName),
      );
      return out;
    },
  };
}
