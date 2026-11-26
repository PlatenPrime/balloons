import type { CaptureResultMessage } from './extensionProtocol.js';
import { ExtensionBridgeError } from './extensionBridge.js';

export type IngestSuccessResult = {
  ok: true;
  status: 'saved' | 'skipped';
  productId: string;
  stock: number;
  price?: number;
};

export type IngestFailureResult = {
  ok: false;
  code: string;
  message: string;
};

export function formatIngestSuccess(result: IngestSuccessResult): string {
  return `Ingest ${result.status}: product ${result.productId} stock=${result.stock}`;
}

export function formatCaptureSuccess(result: Extract<CaptureResultMessage, { ok: true }>): string {
  return `Capture ${result.status}: product ${result.productId} stock=${result.stock} price=${result.price}`;
}

export function formatCaptureResultMessage(result: CaptureResultMessage): string {
  if (result.ok) return formatCaptureSuccess(result);
  return `${result.code}: ${result.message}`;
}

export function formatIngestFailure(result: IngestFailureResult): string {
  return `${result.code}: ${result.message}`;
}

export function formatCaptureError(err: unknown): string {
  if (err instanceof ExtensionBridgeError) {
    return `${err.code}: ${err.message}`;
  }
  return err instanceof Error ? err.message : 'Capture failed';
}

export function formatIngestError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return err instanceof Error ? err.message : 'Ingest failed';
}
