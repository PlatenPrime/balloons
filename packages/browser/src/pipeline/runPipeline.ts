import { StageError } from './stageError.js';

export type StageContext = {
  konk: string;
};

export type Stage<TIn, TOut> = {
  id: string;
  run: (input: TIn, ctx: StageContext) => Promise<TOut> | TOut;
};

export async function runPipeline<T>(
  stages: Array<Stage<unknown, unknown>>,
  initial: unknown,
  ctx: StageContext,
): Promise<T> {
  let value: unknown = initial;
  for (const stage of stages) {
    try {
      value = await stage.run(value, ctx);
    } catch (err) {
      if (err instanceof StageError) {
        throw err;
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new StageError(ctx.konk, stage.id, reason);
    }
  }
  return value as T;
}
