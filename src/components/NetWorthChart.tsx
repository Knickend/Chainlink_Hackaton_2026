import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { mockHistoricalData } from '@/lib/mockData';
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

interface NetWorthChartProps {
  formatValue: (value: number, showDecimals?: boolean) => string;
  displayUnit: DisplayUnit;
}

export function NetWorthChart({ formatValue, displayUnit }: NetWorthChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg">Net Worth Trend</h3>
          <p className="text-sm text-muted-foreground">Last 6 months</p>
        </div>
        <div className="flex items-center gap-2 text-success text-sm font-medium">
          <span>↑ 14.5%</span>
          <span className="text-muted-foreground">vs 6mo ago</span>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockHistoricalData}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }}
              tickFormatter={(value) => {
                const symbol = UNIT_SYMBOLS[displayUnit];
                if (displayUnit === 'GOLD') {
                  return `${(value / 1000).toFixed(1)} ${symbol}`;
                }
                if (displayUnit === 'BTC') {
                  return `${symbol}${value.toFixed(2)}`;
                }
                return `${symbol}${(value / 1000).toFixed(0)}k`;
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220, 18%, 12%)',
                border: '1px solid hsl(220, 15%, 20%)',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
              labelStyle={{ color: 'hsl(40, 20%, 95%)' }}
              formatter={(value: number) => [formatValue(value, false), 'Net Worth']}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="hsl(43, 96%, 56%)"
              strokeWidth={2}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
