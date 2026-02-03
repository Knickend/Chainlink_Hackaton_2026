import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NetWorthChartProps {
  formatValue: (value: number, showDecimals?: boolean) => string;
  formatDisplayUnitValue: (value: number, showDecimals?: boolean) => string;
  displayUnit: DisplayUnit;
  conversionRates: Record<DisplayUnit, number>;
}

export function NetWorthChart({ formatValue, formatDisplayUnitValue, displayUnit, conversionRates }: NetWorthChartProps) {
  const { snapshots, isLoading, formatShortMonth } = usePortfolioHistory();

  // Transform snapshots (sorted newest first) to chart format (oldest first)
  // Convert USD snapshot values to display unit using same rate as StatCard
  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];
    
    const rate = conversionRates[displayUnit];
    
    return snapshots
      .slice(0, 12) // Last 12 months max
      .reverse()    // Oldest first for chart
      .map(snapshot => ({
        month: formatShortMonth(snapshot.snapshot_month),
        netWorth: snapshot.net_worth * rate, // Convert USD to display unit
      }));
  }, [snapshots, formatShortMonth, conversionRates, displayUnit]);

  // Calculate percentage change between oldest and newest
  const periodChange = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const oldest = chartData[0].netWorth;
    const newest = chartData[chartData.length - 1].netWorth;
    const absolute = newest - oldest;
    const percent = oldest !== 0 ? (absolute / oldest) * 100 : (newest !== 0 ? 100 : 0);
    
    return { absolute, percent, isPositive: percent >= 0 };
  }, [chartData]);

  // Dynamic time period label
  const timePeriodLabel = useMemo(() => {
    if (chartData.length === 0) return 'No data';
    if (chartData.length === 1) return 'Current month';
    return `Last ${chartData.length} months`;
  }, [chartData.length]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card p-5"
      >
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

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
          <p className="text-sm text-muted-foreground">{timePeriodLabel}</p>
        </div>
        {periodChange && (
          <div className={cn(
            "flex items-center gap-2 text-sm font-medium",
            periodChange.isPositive ? "text-success" : "text-danger"
          )}>
            {periodChange.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {periodChange.isPositive ? '↑' : '↓'} {Math.abs(periodChange.percent).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs {chartData.length}mo ago</span>
          </div>
        )}
      </div>

      {chartData.length < 2 ? (
        <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm">Not enough data yet</p>
          <p className="text-xs">Take portfolio snapshots to track trends</p>
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
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
                formatter={(value: number) => [formatDisplayUnitValue(value, false), 'Net Worth']}
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
      )}
    </motion.div>
  );
}
