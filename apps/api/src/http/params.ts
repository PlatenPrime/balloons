import type { Request } from 'express';
import { HttpError } from './errors.js';

/** Express 5 types params as `string | string[]`; routes use single-segment params. */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, `invalid_path_param:${name}`);
  }
  return value;
}
