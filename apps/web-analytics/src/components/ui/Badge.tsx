import type { ReactNode } from 'react';

const toneClass = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-900',
  blue: 'bg-sky-100 text-sky-800',
} as const;

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
