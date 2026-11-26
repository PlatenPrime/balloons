import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Badge } from '../components/ui/Badge.js';

export function SkuDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['catalog', 'skus', id],
    queryFn: () => api.getSku(id),
    enabled: Boolean(id),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={query.data?.title ?? id}
        description="SKU detail"
        actions={
          <Link className="text-sm text-slate-600 underline" to="/skus">
            ← Skus
          </Link>
        }
      />
      <QueryState isLoading={query.isLoading} error={query.error}>
        {query.data ? (
          <dl className="grid gap-2 border border-slate-200 bg-white p-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Id</dt>
              <dd className="font-mono text-xs">{query.data.id}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Invalid</dt>
              <dd>
                <Badge tone={query.data.isInvalid ? 'red' : 'green'}>
                  {String(query.data.isInvalid)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Konk</dt>
              <dd className="font-mono text-xs">{query.data.konkName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Prod</dt>
              <dd className="font-mono text-xs">{query.data.prodName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Product id</dt>
              <dd className="font-mono text-xs">{query.data.productId}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Artikul</dt>
              <dd className="font-mono text-xs">{query.data.artikul || '—'}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-slate-500">URL</dt>
              <dd className="font-mono text-xs">{query.data.url || '—'}</dd>
            </div>
          </dl>
        ) : null}
      </QueryState>
    </div>
  );
}
