import { parentPort, workerData } from 'node:worker_threads';
import { buildExcelFromSnapshot } from './builders.js';
import type { ExcelSkuKind } from './kinds.js';
import type { ExcelSnapshot } from './snapshot.js';

type ExcelJobWorkerData = {
  kind: ExcelSkuKind;
  params: Record<string, unknown>;
  snapshot: ExcelSnapshot;
};

async function main(): Promise<void> {
  const data = workerData as ExcelJobWorkerData;
  const result = await buildExcelFromSnapshot(data.kind, data.params, data.snapshot);
  parentPort?.postMessage({
    ok: true,
    filename: result.filename,
    buffer: result.buffer.buffer.slice(
      result.buffer.byteOffset,
      result.buffer.byteOffset + result.buffer.byteLength,
    ),
  });
}

main().catch((err: unknown) => {
  parentPort?.postMessage({
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  });
});
