export class CaptureScriptError extends Error {
  readonly code = 'SCRIPT_FAILED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'CaptureScriptError';
  }
}

/**
 * Distinguishes script/execution failure from a real empty page document.
 * Non-string / missing `result` → SCRIPT_FAILED (throw).
 * Empty/whitespace string → caller treats as EMPTY_HTML.
 */
export function readExecuteScriptHtml(
  results: ReadonlyArray<{ result?: unknown } | undefined> | undefined,
): string {
  if (!results || results.length === 0) {
    throw new CaptureScriptError('executeScript returned no results');
  }
  const first = results[0]?.result;
  if (typeof first !== 'string') {
    throw new CaptureScriptError(
      `executeScript returned unexpected result type: ${first === null ? 'null' : typeof first}`,
    );
  }
  return first;
}
