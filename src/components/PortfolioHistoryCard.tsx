import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingUp, TrendingDown, BarChart3, GitCompare, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { MonthComparisonDialog } from './MonthComparisonDialog';
import { SnapshotDetailView } from './SnapshotDetailView';
import { cn } from '@/lib/utils';
import { ProBadge } from './ProBadge';

interface PortfolioHistoryCardProps {
  currentNetWorth: number;
  formatValue: (value: number, showDecimals?: boolean) => string;
  delay?: number;
}

export function PortfolioHistoryCard({ currentNetWorth, formatValue, delay = 0 }: PortfolioHistoryCardProps) {
  const {
    snapshots,
    isLoading,
    createSnapshot,
    isCreating,
    deleteSnapshot,
    isDeleting,
    selectedMonth,
    setSelectedMonth,
    selectedSnapshot,
    monthOverMonthChange,
    formatMonth,
    formatShortMonth,
    hasSnapshots,
    canCompare,
  } = usePortfolioHistory();

  const [showComparison, setShowComparison] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Get the last 12 snapshots for the chart
  const chartData = snapshots.slice(0, 12).reverse();
  
  // Calculate chart dimensions
  const values = chartData.map(s => s.net_worth);
  const minValue = values.length > 0 ? Math.min(...values) * 0.95 : 0;
  const maxValue = values.length > 0 ? Math.max(...values) * 1.05 : currentNetWorth;
  const range = maxValue - minValue || 1;

  const isPositive = monthOverMonthChange ? monthOverMonthChange.absolute >= 0 : true;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
      >
        <Card className="glass-card">
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
      >
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Portfolio History
                </CardTitle>
                <ProBadge />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => createSnapshot()}
                disabled={isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                Take Snapshot
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!hasSnapshots ? (
              // Empty state
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No Snapshots Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Take your first snapshot to start tracking your portfolio over time.
                </p>
                <Button onClick={() => createSnapshot()} disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  Create First Snapshot
                </Button>
              </div>
            ) : (
              <>
                {/* Interactive Timeline Chart */}
                <div className="h-28 flex items-end gap-1 mb-4">
                  {chartData.map((snapshot, index) => {
                    const height = ((snapshot.net_worth - minValue) / range) * 100;
                    const isSelected = selectedSnapshot?.id === snapshot.id;
                    const isLast = index === chartData.length - 1;

                    return (
                      <button
                        key={snapshot.id}
                        onClick={() => setSelectedMonth(snapshot.id)}
                        className="flex-1 flex flex-col items-center gap-1 group"
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(height, 4)}%` }}
                          transition={{ delay: delay + index * 0.03, duration: 0.4 }}
                          className={cn(
                            "w-full rounded-t-sm min-h-[4px] transition-colors",
                            isSelected
                              ? "bg-primary"
                              : isLast
                                ? isPositive ? "bg-success/80" : "bg-danger/80"
                                : "bg-primary/40 group-hover:bg-primary/60"
                          )}
                        />
                        <span className={cn(
                          "text-[10px] transition-colors",
                          isSelected ? "text-primary font-medium" : "text-muted-foreground"
                        )}>
                          {formatShortMonth(snapshot.snapshot_month)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Month Details */}
                {selectedSnapshot && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedSnapshot.id}
                        onValueChange={setSelectedMonth}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((snapshot) => (
                            <SelectItem key={snapshot.id} value={snapshot.id}>
                              {formatMonth(snapshot.snapshot_month)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Net Worth</p>
                        <p className="text-xl font-bold">{formatValue(selectedSnapshot.net_worth, false)}</p>
                      </div>
                      {monthOverMonthChange && (
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-xs text-muted-foreground mb-1">Change</p>
                          <div className={cn(
                            "flex items-center gap-1",
                            isPositive ? "text-success" : "text-danger"
                          )}>
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span className="text-xl font-bold">
                              {isPositive ? '+' : ''}{monthOverMonthChange.percent.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isPositive ? '+' : ''}{formatValue(monthOverMonthChange.absolute, false)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {canCompare && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowComparison(true)}
                          className="flex-1 gap-2"
                        >
                          <GitCompare className="w-4 h-4" />
                          Compare Months
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetails(true)}
                        className="flex-1 gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Dialog */}
      <MonthComparisonDialog
        open={showComparison}
        onOpenChange={setShowComparison}
        formatValue={formatValue}
      />

      {/* Details Dialog */}
      <SnapshotDetailView
        open={showDetails}
        onOpenChange={setShowDetails}
        snapshot={selectedSnapshot}
        formatValue={formatValue}
        onDelete={deleteSnapshot}
        isDeleting={isDeleting}
      />
    </>
  );
}
