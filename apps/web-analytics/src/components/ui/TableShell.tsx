import type { ReactNode } from 'react';

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return <th className="px-3 py-2 font-medium text-slate-600">{children}</th>;
}

export function Td({
  children,
  className = '',
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`px-3 py-2 text-slate-700 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
