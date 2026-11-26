import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

export function KonksPage() {
  const konksQuery = useQuery({
    queryKey: ['catalog', 'konks'],
    queryFn: () => api.listKonks(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Konks</h1>
        <p className="text-sm text-slate-500">Stub catalog list via GET /catalog/konks</p>
      </div>

      {konksQuery.isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {konksQuery.isError ? (
        <p className="text-sm text-red-600">{(konksQuery.error as Error).message}</p>
      ) : null}

      {konksQuery.data ? (
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {konksQuery.data.items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={3}>
                    No konks seeded
                  </td>
                </tr>
              ) : (
                konksQuery.data.items.map((konk) => (
                  <tr key={konk.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-slate-900">{konk.name}</td>
                    <td className="px-3 py-2 text-slate-700">{konk.title}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">
                      {konk.url || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
