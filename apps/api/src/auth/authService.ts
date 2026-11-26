import { SignJWT, jwtVerify } from 'jose';

export type MemoryUser = {
  username: string;
  password: string;
};

export type AuthService = {
  login(username: string, password: string): Promise<{ token: string; username: string } | null>;
  verify(token: string): Promise<{ username: string } | null>;
};

export type CreateAuthServiceOptions = {
  users: MemoryUser[];
  jwtSecret: string;
  /** Token lifetime, e.g. '12h'. */
  expiresIn?: string;
};

export function createAuthService(options: CreateAuthServiceOptions): AuthService {
  const secret = new TextEncoder().encode(options.jwtSecret);
  const byUsername = new Map(options.users.map((u) => [u.username, u]));
  const expiresIn = options.expiresIn ?? '12h';

  return {
    async login(username, password) {
      const user = byUsername.get(username);
      if (!user || user.password !== password) return null;
      const token = await new SignJWT({ sub: user.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secret);
      return { token, username: user.username };
    },
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, secret);
        const username = typeof payload.sub === 'string' ? payload.sub : null;
        if (!username || !byUsername.has(username)) return null;
        return { username };
      } catch {
        return null;
      }
    },
  };
}
