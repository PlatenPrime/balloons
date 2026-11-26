import { zodResolver } from '@hookform/resolvers/zod';
import { WebApiClientError } from '@balloons/web-api-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth/AuthContext.js';
import { resolveLoginRedirect } from '../lib/loginRedirect.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: 'admin', password: 'admin' },
  });

  if (isAuthenticated) {
    return <Navigate to="/sales" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await login(values.username, values.password);
      void navigate(resolveLoginRedirect(location.state), { replace: true });
    } catch (err) {
      if (err instanceof WebApiClientError) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">web-analytics · JWT against local api</p>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Username</span>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            autoComplete="username"
            {...register('username')}
          />
          {errors.username ? (
            <span className="text-xs text-red-600">{errors.username.message}</span>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Password</span>
          <input
            type="password"
            className="w-full rounded border border-slate-300 px-3 py-2"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password ? (
            <span className="text-xs text-red-600">{errors.password.message}</span>
          ) : null}
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
