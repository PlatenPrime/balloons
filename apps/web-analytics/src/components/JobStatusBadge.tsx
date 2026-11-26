import { Badge } from './ui/Badge.js';

export function JobStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ready'
      ? 'green'
      : status === 'failed'
        ? 'red'
        : status === 'cancelled'
          ? 'amber'
          : status === 'running'
            ? 'blue'
            : 'slate';
  return <Badge tone={tone}>{status}</Badge>;
}
