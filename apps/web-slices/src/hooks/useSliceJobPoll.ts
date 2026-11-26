import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { isTerminalSliceJobStatus, sliceJobPollIntervalMs } from '../lib/jobStatus.js';

export function useSliceJobPoll(
  jobId: string | null,
  options?: {
    onTerminal?: () => void;
  },
) {
  const queryClient = useQueryClient();
  const onTerminalRef = useRef(options?.onTerminal);
  onTerminalRef.current = options?.onTerminal;

  const query = useQuery({
    queryKey: ['slice-jobs', jobId],
    queryFn: () => api.getSliceJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (q) => sliceJobPollIntervalMs(q.state.data?.status),
  });

  useEffect(() => {
    const status = query.data?.status;
    if (!status || !isTerminalSliceJobStatus(status)) return;
    onTerminalRef.current?.();
    void queryClient.invalidateQueries({ queryKey: ['slice-jobs'] });
  }, [query.data?.status, queryClient]);

  return query;
}
