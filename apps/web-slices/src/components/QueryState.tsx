import type { ReactNode } from 'react';

export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyMessage = 'No items',
  children,
}: {
  isLoading: boolean;
  error: Error | null | undefined;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return <p className="text-sm text-red-600">{message}</p>;
  }
  if (isEmpty) return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  return <>{children}</>;
}
