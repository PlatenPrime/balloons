import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client.js';
import { JobStatusBadge } from '../components/JobStatusBadge.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import { useSliceJobPoll } from '../hooks/useSliceJobPoll.js';
import { isTerminalSliceJobStatus } from '../lib/jobStatus.js';

export function JobsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['slice-jobs'],
    queryFn: () => api.listSliceJobs(),
    refetchInterval: 2000,
  });

  const selectedPoll = useSliceJobPoll(selectedId);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelSliceJob(id),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['slice-jobs'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Cancel failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Slice jobs" description="Create from /slices; poll & cancel here" />

      {error ? <Banner tone="error">{error}</Banner> : null}

      {selectedId && selectedPoll.data ? (
        <Banner tone="info">
          Selected <span className="font-mono">{selectedId}</span>{' '}
          <JobStatusBadge status={selectedPoll.data.status} />
          {selectedPoll.data.error ? ` — ${selectedPoll.data.error}` : ''}
        </Banner>
      ) : null}

      <QueryState
        isLoading={listQuery.isLoading}
        error={listQuery.error}
        isEmpty={listQuery.data?.items.length === 0}
        emptyMessage="No slice jobs yet"
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
                      <Button onClick={() => setSelectedId(job.id)}>Watch</Button>
                      {!isTerminalSliceJobStatus(job.status) ? (
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
