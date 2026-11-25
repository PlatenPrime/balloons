export class StageError extends Error {
  readonly konk: string;
  readonly stage: string;
  readonly reason: string;

  constructor(konk: string, stage: string, reason: string) {
    super(`[${konk}/${stage}] ${reason}`);
    this.name = 'StageError';
    this.konk = konk;
    this.stage = stage;
    this.reason = reason;
  }
}
