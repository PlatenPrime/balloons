import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#1e40af', '#0369a1'];

export type PieSlice = { name: string; value: number };

export function PieChartCard({
  data,
  emptyMessage = 'No pie data for this range.',
}: {
  data: PieSlice[];
  emptyMessage?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="h-80 w-full rounded border border-slate-200 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" outerRadius={100} label>
            {filtered.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length] ?? '#0f172a'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
