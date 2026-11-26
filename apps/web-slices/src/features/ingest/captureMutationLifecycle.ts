import type { CaptureResultMessage } from './extensionProtocol.js';
import { formatCaptureError, formatCaptureResultMessage } from './clientIngestFeedback.js';

export type CaptureMutationUiState = {
  capturingSkuId: string | null;
  message: string | null;
  shouldInvalidatePending: boolean;
};

export function onCaptureMutate(
  state: CaptureMutationUiState,
  item: { skuId: string },
): CaptureMutationUiState {
  return {
    ...state,
    capturingSkuId: item.skuId,
    message: null,
    shouldInvalidatePending: false,
  };
}

export function onCaptureSuccess(
  state: CaptureMutationUiState,
  result: CaptureResultMessage,
): CaptureMutationUiState {
  return {
    ...state,
    message: formatCaptureResultMessage(result),
    shouldInvalidatePending: result.ok,
  };
}

export function onCaptureError(
  state: CaptureMutationUiState,
  err: unknown,
): CaptureMutationUiState {
  return {
    ...state,
    message: formatCaptureError(err),
    shouldInvalidatePending: false,
  };
}

export function onCaptureSettled(state: CaptureMutationUiState): CaptureMutationUiState {
  return {
    ...state,
    capturingSkuId: null,
  };
}

export function buildExtensionCaptureRequest(input: {
  konk: string;
  skuId: string;
  sourceUrl: string;
  apiBaseUrl: string;
}): { konk: string; skuId: string; sourceUrl: string; apiBaseUrl: string } {
  return {
    konk: input.konk,
    skuId: input.skuId,
    sourceUrl: input.sourceUrl,
    apiBaseUrl: input.apiBaseUrl,
  };
}
