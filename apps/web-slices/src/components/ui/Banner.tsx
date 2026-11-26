import type { ReactNode } from 'react';

const toneClass = {
  info: 'border-slate-200 bg-slate-50 text-slate-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-950',
} as const;

export function Banner({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return <div className={`rounded border px-3 py-2 text-sm ${toneClass[tone]}`}>{children}</div>;
}
