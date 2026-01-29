import { motion } from 'framer-motion';
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

interface PriorityBreakdownChartProps {
  data: { priority: string; count: number }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'hsl(0, 84%, 60%)',
  high: 'hsl(25, 95%, 53%)',
  medium: 'hsl(43, 96%, 56%)',
  low: 'hsl(142, 71%, 45%)',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

export function PriorityBreakdownChart({ data }: PriorityBreakdownChartProps) {
  // Sort by priority order and add labels/colors
  const chartData = PRIORITY_ORDER
    .map(priority => {
      const item = data.find(d => d.priority === priority);
      return {
        name: PRIORITY_LABELS[priority] || priority,
        count: item?.count || 0,
        color: PRIORITY_COLORS[priority] || 'hsl(var(--muted))',
        priority,
      };
    })
    .filter(d => d.count > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold mb-4">Bug Priority Breakdown</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Distribution by severity level
      </p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
            <XAxis 
              type="number" 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
              allowDecimals={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => [value, 'Bugs']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
