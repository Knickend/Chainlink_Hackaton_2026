import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface PerformanceCardProps {
  currentNetWorth: number;
  formatValue: (value: number, showDecimals?: boolean) => string;
  delay?: number;
}

type TimeFrame = 'ytd' | 'rolling12';

// Mock historical data - in a real app this would come from the database
const generateMockPerformanceData = (currentNetWorth: number) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Generate YTD data (from Jan 1st to now)
  const ytdData = [];
  const startOfYearValue = currentNetWorth * 0.88; // Started ~12% lower
  
  for (let i = 0; i <= currentMonth; i++) {
    const progress = i / Math.max(currentMonth, 1);
    const variation = 1 + (Math.random() - 0.5) * 0.03;
    const value = startOfYearValue + (currentNetWorth - startOfYearValue) * progress * variation;
    ytdData.push({
      month: new Date(currentYear, i).toLocaleString('en-US', { month: 'short' }),
      value: Math.round(value),
    });
  }
  
  // Generate Rolling 12 months data
  const rolling12Data = [];
  const twelveMonthsAgoValue = currentNetWorth * 0.82; // Started ~18% lower
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const progress = (11 - i) / 11;
    const variation = 1 + (Math.random() - 0.5) * 0.03;
    const value = twelveMonthsAgoValue + (currentNetWorth - twelveMonthsAgoValue) * progress * variation;
    rolling12Data.push({
      month: date.toLocaleString('en-US', { month: 'short' }),
      value: Math.round(value),
    });
  }
  
  return { ytdData, rolling12Data };
};

export function PerformanceCard({ currentNetWorth, formatValue, delay = 0 }: PerformanceCardProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('ytd');
  
  const { ytdData, rolling12Data } = useMemo(
    () => generateMockPerformanceData(currentNetWorth),
    [currentNetWorth]
  );
  
  const data = timeFrame === 'ytd' ? ytdData : rolling12Data;
  const startValue = data[0]?.value || 0;
  const endValue = data[data.length - 1]?.value || currentNetWorth;
  const change = endValue - startValue;
  const changePercent = startValue > 0 ? ((change / startValue) * 100) : 0;
  const isPositive = change >= 0;
  
  // Find min and max for chart scaling
  const values = data.map(d => d.value);
  const minValue = Math.min(...values) * 0.98;
  const maxValue = Math.max(...values) * 1.02;
  const range = maxValue - minValue;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance
            </CardTitle>
            <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
              <TabsList className="h-8">
                <TabsTrigger value="ytd" className="text-xs px-3 h-6">
                  <Calendar className="w-3 h-3 mr-1" />
                  YTD
                </TabsTrigger>
                <TabsTrigger value="rolling12" className="text-xs px-3 h-6">
                  12M
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Performance Summary */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-2xl font-bold">{formatValue(endValue, false)}</span>
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-success" : "text-danger"
            )}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{isPositive ? '+' : ''}{changePercent.toFixed(1)}%</span>
              <span className="text-muted-foreground font-normal">
                ({isPositive ? '+' : ''}{formatValue(change, false)})
              </span>
            </div>
          </div>
          
          {/* Mini Chart */}
          <div className="h-24 flex items-end gap-1">
            {data.map((point, index) => {
              const height = range > 0 ? ((point.value - minValue) / range) * 100 : 50;
              const isLast = index === data.length - 1;
              
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: delay + index * 0.03, duration: 0.4 }}
                    className={cn(
                      "w-full rounded-t-sm min-h-[4px]",
                      isLast 
                        ? isPositive ? "bg-success" : "bg-danger"
                        : "bg-primary/40"
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {point.month}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Period Label */}
          <p className="text-xs text-muted-foreground text-center mt-3">
            {timeFrame === 'ytd' 
              ? `Jan ${new Date().getFullYear()} - Present`
              : 'Last 12 Months'
            }
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
