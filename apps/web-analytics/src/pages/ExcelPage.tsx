import { WebApiClientError, type excelJobSchema } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '../api/client.js';
import { JobStatusBadge } from '../components/JobStatusBadge.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { Field, TextSelect, TextTextarea } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import {
  EXCEL_KINDS,
  defaultParamsForKind,
  excelDownloadFilename,
  parseExcelParamsJson,
  withDefaultSkuId,
  type ExcelKind,
} from '../lib/excelParams.js';
import { excelJobPollIntervalMs, isTerminalExcelJobStatus } from '../lib/excelJobStatus.js';

type ExcelJob = z.infer<typeof excelJobSchema>;

async function downloadExcelFile(job: ExcelJob): Promise<void> {
  const res = await api.getExcelFile(job.id);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = excelDownloadFilename(job);
  a.click();
  URL.revokeObjectURL(url);
}

export function ExcelPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ExcelKind>('sku-one-sales');
  const [paramsJson, setParamsJson] = useState(() =>
    JSON.stringify(defaultParamsForKind('sku-one-sales'), null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);

  const skusQuery = useQuery({
    queryKey: ['catalog', 'skus'],
    queryFn: () => api.listSkus(),
  });

  const defaultSkuId = skusQuery.data?.items[0]?.id;

  useEffect(() => {
    if (!defaultSkuId) return;
    if (kind !== 'sku-one-sales' && kind !== 'sku-one-stock') return;
    setParamsJson((raw) => {
      try {
        const parsed = parseExcelParamsJson(raw);
        const next = withDefaultSkuId(kind, parsed, defaultSkuId);
        if (next.skuId === parsed.skuId) return raw;
        return JSON.stringify(next, null, 2);
      } catch {
        return raw;
      }
    });
  }, [defaultSkuId, kind]);

  const listQuery = useQuery({
    queryKey: ['excel-jobs'],
    queryFn: () => api.listExcelJobs(),
    refetchInterval: 2000,
  });

  const watchQuery = useQuery({
    queryKey: ['excel-jobs', watchId],
    queryFn: () => api.getExcelJob(watchId!),
    enabled: Boolean(watchId),
    refetchInterval: (q) => excelJobPollIntervalMs(q.state.data?.status),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let params: Record<string, unknown>;
      try {
        params = withDefaultSkuId(kind, parseExcelParamsJson(paramsJson), defaultSkuId);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Params must be valid JSON');
      }
      return api.createExcelJob({ kind, params });
    },
    onSuccess: async (job) => {
      setError(null);
      setWatchId(job.id);
      await queryClient.invalidateQueries({ queryKey: ['excel-jobs'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : String(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelExcelJob(id),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['excel-jobs'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Cancel failed');
    },
  });

  const kinds = useMemo(() => EXCEL_KINDS, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Excel jobs" description="CI kinds only · create, poll, download" />

      {error ? <Banner tone="error">{error}</Banner> : null}

      <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 lg:grid-cols-2">
        <Field label="Kind">
          <TextSelect
            value={kind}
            onChange={(e) => {
              const next = e.target.value as ExcelKind;
              setKind(next);
              setParamsJson(JSON.stringify(defaultParamsForKind(next), null, 2));
            }}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </TextSelect>
        </Field>
        <div className="flex items-end">
          <Button
            variant="primary"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creating…' : 'Create job'}
          </Button>
        </div>
        <Field label="Params (JSON)" hint="skuId auto-fills from catalog when empty">
          <TextTextarea
            rows={10}
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
          />
        </Field>
      </div>

      {watchId && watchQuery.data ? (
        <Banner tone="info">
          Watching <span className="font-mono">{watchId}</span>{' '}
          <JobStatusBadge status={watchQuery.data.status} />
          {watchQuery.data.error ? ` — ${watchQuery.data.error}` : ''}
          {watchQuery.data.status === 'ready' ? (
            <>
              {' '}
              <Button
                onClick={() => {
                  void downloadExcelFile(watchQuery.data!).catch((err) => {
                    setError(err instanceof Error ? err.message : 'Download failed');
                  });
                }}
              >
                Download
              </Button>
            </>
          ) : null}
        </Banner>
      ) : null}

      <QueryState
        isLoading={listQuery.isLoading}
        error={listQuery.error}
        isEmpty={listQuery.data?.items.length === 0}
        emptyMessage="No excel jobs yet"
      >
        {listQuery.data ? (
          <TableShell>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>Id</Th>
                <Th>Kind</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <Td className="font-mono text-xs">{job.id}</Td>
                  <Td className="font-mono text-xs">{job.kind}</Td>
                  <Td>
                    <JobStatusBadge status={job.status} />
                  </Td>
                  <Td className="font-mono text-xs">{job.updatedAt}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setWatchId(job.id)}>Watch</Button>
                      {job.status === 'ready' ? (
                        <Button
                          onClick={() => {
                            void downloadExcelFile(job).catch((err) => {
                              setError(err instanceof Error ? err.message : 'Download failed');
                            });
                          }}
                        >
                          Download
                        </Button>
                      ) : null}
                      {!isTerminalExcelJobStatus(job.status) ? (
                        <Button
                          variant="danger"
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(job.id)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}
      </QueryState>
    </div>
  );
}
