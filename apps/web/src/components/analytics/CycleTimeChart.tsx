import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CycleTimePoint } from '@/api/analytics.api';

interface CycleTimeChartProps {
  data: CycleTimePoint[];
}

export function CycleTimeChart({ data }: CycleTimeChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Cycle Time Distribution</h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">How long cards live (created → archived)</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
            itemStyle={{ color: 'var(--color-text-muted)' }}
            formatter={(v) => [v, 'Cards']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={`hsl(248, ${40 + Math.round((entry.count / max) * 50)}%, ${55 - Math.round((entry.count / max) * 15)}%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
