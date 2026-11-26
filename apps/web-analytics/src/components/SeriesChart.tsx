import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SeriesPoint } from '../lib/reportSeries.js';

export type { SeriesPoint };

export function SeriesChart({
  data,
  lines,
}: {
  data: SeriesPoint[];
  lines: Array<{ key: 'stock' | 'sales' | 'revenue'; color: string; name: string }>;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No series points for this range.</p>;
  }

  return (
    <div className="h-80 w-full rounded border border-slate-200 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
