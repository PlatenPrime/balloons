import { describe, expect, it } from 'vitest';
import { excelJobPollIntervalMs, isTerminalExcelJobStatus } from './excelJobStatus.js';

describe('excelJobStatus', () => {
  it('treats ready/failed/cancelled as terminal', () => {
    expect(isTerminalExcelJobStatus('ready')).toBe(true);
    expect(isTerminalExcelJobStatus('failed')).toBe(true);
    expect(isTerminalExcelJobStatus('cancelled')).toBe(true);
    expect(isTerminalExcelJobStatus('queued')).toBe(false);
    expect(isTerminalExcelJobStatus('running')).toBe(false);
  });

  it('polls only while non-terminal', () => {
    expect(excelJobPollIntervalMs('queued')).toBe(1000);
    expect(excelJobPollIntervalMs('running')).toBe(1000);
    expect(excelJobPollIntervalMs('ready')).toBe(false);
    expect(excelJobPollIntervalMs(undefined)).toBe(false);
  });
});
