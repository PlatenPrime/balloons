import { useQuery } from '@tanstack/react-query';
import { api, apiBaseUrl } from '../api/client.js';

export function HealthPage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health(),
  });
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Health</h1>
        <p className="text-sm text-slate-500">API base: {apiBaseUrl}</p>
      </div>

      <section className="border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-700">GET /health</h2>
        {healthQuery.isLoading ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : null}
        {healthQuery.isError ? (
          <p className="mt-2 text-sm text-red-600">{(healthQuery.error as Error).message}</p>
        ) : null}
        {healthQuery.data ? (
          <pre className="mt-2 overflow-x-auto text-sm text-slate-800">
            {JSON.stringify(healthQuery.data, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-700">GET /auth/me</h2>
        {meQuery.isLoading ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : null}
        {meQuery.isError ? (
          <p className="mt-2 text-sm text-red-600">{(meQuery.error as Error).message}</p>
        ) : null}
        {meQuery.data ? (
          <pre className="mt-2 overflow-x-auto text-sm text-slate-800">
            {JSON.stringify(meQuery.data, null, 2)}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
