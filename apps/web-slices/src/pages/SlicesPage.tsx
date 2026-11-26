import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { JobStatusBadge } from '../components/JobStatusBadge.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { Field, TextInput } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import { useSliceJobPoll } from '../hooks/useSliceJobPoll.js';
import { filterInvalidDayPoints, isInvalidSlicePoint } from '../lib/invalidPoints.js';
import { parseSlicesSearch, writeSlicesSearch } from '../lib/urlSearch.js';

export function SlicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { konk, day } = parseSlicesSearch(searchParams);
  const queryClient = useQueryClient();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState('');
  const [editStock, setEditStock] = useState('0');
  const [editPrice, setEditPrice] = useState('0');
  const [actionError, setActionError] = useState<string | null>(null);
  const [onlyInvalid, setOnlyInvalid] = useState(true);

  const metaQuery = useQuery({
    queryKey: ['slices', konk, day, 'meta'],
    queryFn: () => api.getDayMeta(konk, day),
  });

  const pointsQuery = useQuery({
    queryKey: ['slices', konk, day, 'points'],
    queryFn: () => api.listDayPoints(konk, day),
  });

  const invalidateDay = () => {
    void queryClient.invalidateQueries({ queryKey: ['slices', konk, day] });
  };

  const jobPoll = useSliceJobPoll(activeJobId, {
    onTerminal: invalidateDay,
  });

  const createJob = useMutation({
    mutationFn: (kind: 'slice.run' | 'compensation.run') =>
      kind === 'slice.run'
        ? api.createSliceJob({ kind: 'slice.run', konk, day })
        : api.createSliceJob({ kind: 'compensation.run', konk, day }),
    onSuccess: (job) => {
      setActionError(null);
      setActiveJobId(job.id);
      void queryClient.invalidateQueries({ queryKey: ['slice-jobs'] });
    },
    onError: (err) => {
      setActionError(err instanceof WebApiClientError ? err.message : 'Job create failed');
    },
  });

  const cancelJob = useMutation({
    mutationFn: (id: string) => api.cancelSliceJob(id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['slice-jobs'] });
    },
    onError: (err) => {
      setActionError(err instanceof WebApiClientError ? err.message : 'Cancel failed');
    },
  });

  const putPoint = useMutation({
    mutationFn: () =>
      api.putPoint(konk, editProductId, {
        date: day,
        point: { stock: Number(editStock), price: Number(editPrice) },
      }),
    onSuccess: () => {
      setActionError(null);
      invalidateDay();
    },
    onError: (err) => {
      setActionError(err instanceof WebApiClientError ? err.message : 'putPoint failed');
    },
  });

  const points = useMemo(() => {
    const items = pointsQuery.data?.items ?? [];
    return onlyInvalid ? filterInvalidDayPoints(items) : items;
  }, [pointsQuery.data?.items, onlyInvalid]);

  const meta = metaQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Day slices"
        description="Status, invalid points, sliceJobs run / compensation / cancel"
        actions={
          <Link className="text-sm text-slate-600 underline" to="/jobs">
            All jobs →
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-3">
        <Field label="konk">
          <TextInput
            value={konk}
            onChange={(e) =>
              setSearchParams(writeSlicesSearch({ konk: e.target.value || 'air', day }))
            }
          />
        </Field>
        <Field label="day (wire)" hint="ISO or YYYY-MM-DD">
          <TextInput
            value={day}
            onChange={(e) =>
              setSearchParams(writeSlicesSearch({ konk, day: e.target.value || day }))
            }
          />
        </Field>
        <Button
          variant="primary"
          disabled={createJob.isPending}
          onClick={() => createJob.mutate('slice.run')}
        >
          Run slice
        </Button>
        <Button disabled={createJob.isPending} onClick={() => createJob.mutate('compensation.run')}>
          Compensation
        </Button>
        {activeJobId ? (
          <Button
            variant="danger"
            disabled={cancelJob.isPending}
            onClick={() => cancelJob.mutate(activeJobId)}
          >
            Cancel job
          </Button>
        ) : null}
      </div>

      {actionError ? <Banner tone="error">{actionError}</Banner> : null}

      {activeJobId ? (
        <Banner tone={jobPoll.data?.status === 'failed' ? 'error' : 'info'}>
          Active job <span className="font-mono">{activeJobId}</span>{' '}
          {jobPoll.data ? <JobStatusBadge status={jobPoll.data.status} /> : '…'}
          {jobPoll.data?.error ? ` — ${jobPoll.data.error}` : ''}
        </Banner>
      ) : null}

      <section className="space-y-2 border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Day meta</h2>
        <QueryState isLoading={metaQuery.isLoading} error={metaQuery.error}>
          {meta === null ? (
            <p className="text-sm text-slate-500">No meta for this day yet</p>
          ) : meta ? (
            <dl className="grid gap-2 text-sm md:grid-cols-3">
              <div>
                <dt className="text-slate-500">Konk</dt>
                <dd className="font-mono">{meta.konkName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Date</dt>
                <dd className="font-mono text-xs">{meta.date}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Stats</dt>
                <dd className="font-mono text-xs">
                  {meta.stats
                    ? `filled=${meta.stats.filled} invalid=${meta.stats.invalid} errors=${meta.stats.errorCount}`
                    : '—'}
                </dd>
              </div>
            </dl>
          ) : null}
        </QueryState>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Points</h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyInvalid}
              onChange={(e) => setOnlyInvalid(e.target.checked)}
            />
            Only invalid
          </label>
        </div>

        <QueryState
          isLoading={pointsQuery.isLoading}
          error={pointsQuery.error}
          isEmpty={points.length === 0}
          emptyMessage={onlyInvalid ? 'No invalid points' : 'No points'}
        >
          <TableShell>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>Product</Th>
                <Th>Stock</Th>
                <Th>Price</Th>
                <Th>Invalid</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {points.map((row) => {
                const invalid = isInvalidSlicePoint(row.point);
                return (
                  <tr
                    key={row.productId}
                    className={`border-t border-slate-100 ${invalid ? 'bg-red-50/40' : ''}`}
                  >
                    <Td className="font-mono text-xs">{row.productId}</Td>
                    <Td className="font-mono">{row.point.stock}</Td>
                    <Td className="font-mono">{row.point.price}</Td>
                    <Td>{String(invalid)}</Td>
                    <Td>
                      <Button
                        onClick={() => {
                          setEditProductId(row.productId);
                          setEditStock(String(row.point.stock));
                          setEditPrice(String(row.point.price));
                        }}
                      >
                        Edit
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </QueryState>
      </section>

      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Post-correction (putPoint)</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="productId">
            <TextInput value={editProductId} onChange={(e) => setEditProductId(e.target.value)} />
          </Field>
          <Field label="stock">
            <TextInput value={editStock} onChange={(e) => setEditStock(e.target.value)} />
          </Field>
          <Field label="price">
            <TextInput value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
          </Field>
        </div>
        <Button
          variant="primary"
          disabled={!editProductId || putPoint.isPending}
          onClick={() => putPoint.mutate()}
        >
          Save point
        </Button>
      </section>
    </div>
  );
}
