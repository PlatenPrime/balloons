export const SLICE_JOB_TERMINAL = ['completed', 'failed', 'cancelled'] as const;

export type SliceJobTerminalStatus = (typeof SLICE_JOB_TERMINAL)[number];

export type SliceJobPollStatus = 'queued' | 'running' | SliceJobTerminalStatus | (string & {});

export function isTerminalSliceJobStatus(status: string): status is SliceJobTerminalStatus {
  return (SLICE_JOB_TERMINAL as readonly string[]).includes(status);
}

export function sliceJobPollIntervalMs(status: string | undefined): number | false {
  if (!status || isTerminalSliceJobStatus(status)) return false;
  return 1000;
}
