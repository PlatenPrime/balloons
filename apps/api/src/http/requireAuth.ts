import type { NextFunction, Request, Response } from 'express';
import type { AuthService } from '../auth/authService.js';
import { HttpError } from './errors.js';

export type AuthedRequest = Request & { user?: { username: string } };

export function createRequireAuth(auth: AuthService) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization');
      if (!header?.startsWith('Bearer ')) {
        throw new HttpError(401, 'unauthorized');
      }
      const token = header.slice('Bearer '.length).trim();
      const user = await auth.verify(token);
      if (!user) throw new HttpError(401, 'unauthorized');
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
