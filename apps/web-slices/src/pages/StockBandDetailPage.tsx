import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { JobStatusBadge } from '../components/JobStatusBadge.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { Field, TextInput, TextTextarea } from '../components/ui/Field.js';
import { useSliceJobPoll } from '../hooks/useSliceJobPoll.js';
import { DEFAULT_SLICE_DAY } from '../lib/urlSearch.js';

export function StockBandDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stockMin, setStockMin] = useState('');
  const [stockMax, setStockMax] = useState('');
  const [normalMax, setNormalMax] = useState('');
  const [productIdsText, setProductIdsText] = useState('');
  const [dateFrom, setDateFrom] = useState(DEFAULT_SLICE_DAY);
  const [dateTo, setDateTo] = useState(DEFAULT_SLICE_DAY);
  const [discoverJson, setDiscoverJson] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bandQuery = useQuery({
    queryKey: ['catalog', 'stock-bands', id],
    queryFn: () => api.getStockBand(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!bandQuery.data) return;
    setStockMin(String(bandQuery.data.stockMin));
    setStockMax(String(bandQuery.data.stockMax));
    setNormalMax(String(bandQuery.data.normalMax));
  }, [bandQuery.data]);

  const jobPoll = useSliceJobPoll(jobId);

  const productIds = productIdsText
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const updateMutation = useMutation({
    mutationFn: () => {
      const band = bandQuery.data!;
      return api.updateStockBand(id, {
        id,
        konk: band.konk,
        stockMin: Number(stockMin),
        stockMax: Number(stockMax),
        normalMax: Number(normalMax),
      });
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'stock-bands'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteStockBand(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'stock-bands'] });
      void navigate('/stock-bands');
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Delete failed');
    },
  });

  const discoverMutation = useMutation({
    mutationFn: () =>
      api.discoverStockBand({
        bandId: id,
        productIds,
        dateFrom,
        dateTo,
      }),
    onSuccess: (raw) => {
      setError(null);
      setDiscoverJson(JSON.stringify(raw, null, 2));
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Discover failed');
    },
  });

  const batchMutation = useMutation({
    mutationFn: () =>
      api.batchCorrectStockBand({
        bandId: id,
        productIds,
        dateFrom,
        dateTo,
      }),
    onSuccess: (job) => {
      setError(null);
      setJobId(job.id);
      void queryClient.invalidateQueries({ queryKey: ['slice-jobs'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Batch correct failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={bandQuery.data ? `Band ${bandQuery.data.id}` : id}
        description="Update / delete / discover / batch-correct"
        actions={
          <Link className="text-sm text-slate-600 underline" to="/stock-bands">
            ← Stock bands
          </Link>
        }
      />

      <QueryState isLoading={bandQuery.isLoading} error={bandQuery.error}>
        {bandQuery.data ? (
          <dl className="grid gap-2 border border-slate-200 bg-white p-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Konk</dt>
              <dd className="font-mono text-xs">
                {bandQuery.data.konk.name} ({bandQuery.data.konk.title})
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Id</dt>
              <dd className="font-mono text-xs">{bandQuery.data.id}</dd>
            </div>
          </dl>
        ) : null}
      </QueryState>

      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Update</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="stockMin">
            <TextInput value={stockMin} onChange={(e) => setStockMin(e.target.value)} />
          </Field>
          <Field label="stockMax">
            <TextInput value={stockMax} onChange={(e) => setStockMax(e.target.value)} />
          </Field>
          <Field label="normalMax">
            <TextInput value={normalMax} onChange={(e) => setNormalMax(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={!bandQuery.data || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            Delete
          </Button>
        </div>
      </section>

      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Discover / batch-correct</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="dateFrom">
            <TextInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
          <Field label="dateTo">
            <TextInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label="productIds">
              <TextTextarea
                value={productIdsText}
                onChange={(e) => setProductIdsText(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={productIds.length === 0 || discoverMutation.isPending}
            onClick={() => discoverMutation.mutate()}
          >
            Discover
          </Button>
          <Button
            variant="primary"
            disabled={productIds.length === 0 || batchMutation.isPending}
            onClick={() => batchMutation.mutate()}
          >
            Batch correct
          </Button>
        </div>
        {jobId ? (
          <Banner tone="info">
            Job <span className="font-mono">{jobId}</span>{' '}
            {jobPoll.data ? <JobStatusBadge status={jobPoll.data.status} /> : null}
          </Banner>
        ) : null}
        {discoverJson ? (
          <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs">
            {discoverJson}
          </pre>
        ) : null}
      </section>

      {error ? <Banner tone="error">{error}</Banner> : null}
    </div>
  );
}
