import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationChartProps {
  data: { category: string; total: number; count: number }[];
  formatDisplayUnitValue: (value: number, showDecimals?: boolean) => string;
}

const COLORS = {
  banking: '#3B82F6',
  realestate: '#8B5CF6',
  crypto: '#F7931A',
  stocks: '#22C55E',
  commodities: '#EAB308',
};

const LABELS = {
  banking: 'Cash & Stablecoins',
  realestate: 'Real Estate, Equity & Misc.',
  crypto: 'Cryptocurrency',
  stocks: 'Stocks, Bonds & ETFs',
  commodities: 'Commodities',
};

export function AllocationChart({ data, formatDisplayUnitValue }: AllocationChartProps) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="glass-card p-5"
    >
      <div className="mb-4">
        <h3 className="font-semibold text-lg">Asset Allocation</h3>
        <p className="text-sm text-muted-foreground">Portfolio distribution</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="h-[180px] w-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="total"
                nameKey="category"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={COLORS[entry.category as keyof typeof COLORS]}
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220, 18%, 12%)',
                  border: '1px solid hsl(220, 15%, 20%)',
                  borderRadius: '8px',
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#9ca3af' }}
                wrapperStyle={{ zIndex: 50 }}
                formatter={(value: number) => [formatDisplayUnitValue(value), '']}
                labelFormatter={(label) => LABELS[label as keyof typeof LABELS] || label}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {data.map((item) => {
            const percentage = ((item.total / total) * 100).toFixed(1);
            return (
              <div key={item.category} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[item.category as keyof typeof COLORS] }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {LABELS[item.category as keyof typeof LABELS]}
                    </span>
                    <span className="text-sm text-muted-foreground">{percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: COLORS[item.category as keyof typeof COLORS] }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
