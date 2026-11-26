export const EXCEL_JOB_TERMINAL = ['ready', 'failed', 'cancelled'] as const;

export type ExcelJobTerminalStatus = (typeof EXCEL_JOB_TERMINAL)[number];

export function isTerminalExcelJobStatus(status: string): status is ExcelJobTerminalStatus {
  return (EXCEL_JOB_TERMINAL as readonly string[]).includes(status);
}

export function excelJobPollIntervalMs(status: string | undefined): number | false {
  if (!status || isTerminalExcelJobStatus(status)) return false;
  return 1000;
}
