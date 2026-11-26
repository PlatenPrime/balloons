import { describe, expect, it } from 'vitest';
import { CaptureScriptError, readExecuteScriptHtml } from './captureHtmlResult.js';

describe('readExecuteScriptHtml', () => {
  it('returns HTML string from executeScript results', () => {
    expect(readExecuteScriptHtml([{ result: '<html></html>' }])).toBe('<html></html>');
  });

  it('returns empty string so EMPTY_HTML can apply later', () => {
    expect(readExecuteScriptHtml([{ result: '' }])).toBe('');
    expect(readExecuteScriptHtml([{ result: '   ' }])).toBe('   ');
  });

  it('throws SCRIPT_FAILED when results are missing', () => {
    expect(() => readExecuteScriptHtml(undefined)).toThrow(CaptureScriptError);
    expect(() => readExecuteScriptHtml([])).toThrow(/no results/);
  });

  it('throws SCRIPT_FAILED for non-string results', () => {
    expect(() => readExecuteScriptHtml([{ result: null }])).toThrow(/null/);
    expect(() => readExecuteScriptHtml([{ result: 42 }])).toThrow(/number/);
    expect(() => readExecuteScriptHtml([{}])).toThrow(CaptureScriptError);
  });
});
