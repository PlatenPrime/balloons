import { loginRequestSchema } from '@balloons/web-api-client';
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { asyncHandler, HttpError } from '../http/errors.js';
import type { AuthedRequest } from '../http/requireAuth.js';

/** Public routes (no JWT). */
export function createPublicAuthRouter(deps: AppDeps): Router {
  const router = Router();

  router.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
      const body = loginRequestSchema.parse(req.body);
      const result = await deps.auth.login(body.username, body.password);
      if (!result) throw new HttpError(401, 'invalid_credentials');
      res.status(200).json({
        token: result.token,
        user: { username: result.username },
      });
    }),
  );

  return router;
}

/** Protected routes (JWT required). */
export function createAuthedAuthRouter(): Router {
  const router = Router();

  router.get(
    '/auth/me',
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user;
      if (!user) throw new HttpError(401, 'unauthorized');
      res.status(200).json({ username: user.username });
    }),
  );

  return router;
}
