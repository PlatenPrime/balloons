import { z } from 'zod';

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    username: z.string(),
  }),
});

export const meResponseSchema = z.object({
  username: z.string(),
});
