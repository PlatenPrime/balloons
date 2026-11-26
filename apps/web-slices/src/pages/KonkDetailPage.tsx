import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { ClientIngestPanel } from '../features/ingest/ClientIngestPanel.js';

export function KonkDetailPage() {
  const { name = '' } = useParams();
  const konkQuery = useQuery({
    queryKey: ['catalog', 'konks', name],
    queryFn: () => api.getKonk(name),
    enabled: Boolean(name),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={konkQuery.data?.title ?? name}
        description={`Konk detail · ${name}`}
        actions={
          <Link className="text-sm text-slate-600 underline" to="/konks">
            ← Konks
          </Link>
        }
      />

      <QueryState isLoading={konkQuery.isLoading} error={konkQuery.error}>
        {konkQuery.data ? (
          <dl className="grid gap-2 border border-slate-200 bg-white p-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-mono text-slate-900">{konkQuery.data.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">URL</dt>
              <dd className="font-mono text-xs text-slate-900">{konkQuery.data.url || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Recount days</dt>
              <dd className="font-mono text-xs text-slate-900">
                {konkQuery.data.recountDays.length ? konkQuery.data.recountDays.join(', ') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Image</dt>
              <dd className="font-mono text-xs text-slate-900">{konkQuery.data.imageUrl || '—'}</dd>
            </div>
          </dl>
        ) : null}
      </QueryState>

      {name ? <ClientIngestPanel konkName={name} /> : null}
    </div>
  );
}
