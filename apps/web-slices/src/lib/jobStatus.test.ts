import { describe, expect, it } from 'vitest';
import { isTerminalSliceJobStatus, sliceJobPollIntervalMs } from './jobStatus.js';

describe('jobStatus', () => {
  it('marks completed/failed/cancelled as terminal', () => {
    expect(isTerminalSliceJobStatus('completed')).toBe(true);
    expect(isTerminalSliceJobStatus('failed')).toBe(true);
    expect(isTerminalSliceJobStatus('cancelled')).toBe(true);
    expect(isTerminalSliceJobStatus('queued')).toBe(false);
    expect(isTerminalSliceJobStatus('running')).toBe(false);
  });

  it('polls only while non-terminal', () => {
    expect(sliceJobPollIntervalMs('queued')).toBe(1000);
    expect(sliceJobPollIntervalMs('running')).toBe(1000);
    expect(sliceJobPollIntervalMs('completed')).toBe(false);
    expect(sliceJobPollIntervalMs(undefined)).toBe(false);
  });
});
