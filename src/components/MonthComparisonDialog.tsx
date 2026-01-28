import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowRight, GitCompare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolioHistory, MonthComparison } from '@/hooks/usePortfolioHistory';
import { cn } from '@/lib/utils';

interface MonthComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatValue: (value: number, showDecimals?: boolean) => string;
}

interface ChangeRowProps {
  label: string;
  value1: number;
  value2: number;
  change: { absolute: number; percent: number };
  formatValue: (value: number, showDecimals?: boolean) => string;
}

function ChangeRow({ label, value1, value2, change, formatValue }: ChangeRowProps) {
  const isPositive = change.absolute >= 0;
  const isNeutral = change.absolute === 0;

  return (
    <div className="grid grid-cols-4 gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-right">{formatValue(value1, false)}</span>
      <span className="text-sm text-right">{formatValue(value2, false)}</span>
      <div className={cn(
        "text-sm text-right font-medium flex items-center justify-end gap-1",
        isNeutral ? "text-muted-foreground" : isPositive ? "text-success" : "text-danger"
      )}>
        {!isNeutral && (isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
        <span>
          {isPositive ? '+' : ''}{change.percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function MonthComparisonDialog({ open, onOpenChange, formatValue }: MonthComparisonDialogProps) {
  const { snapshots, getComparison, formatMonth } = usePortfolioHistory();
  const [month1Id, setMonth1Id] = useState<string>('');
  const [month2Id, setMonth2Id] = useState<string>('');
  const [comparison, setComparison] = useState<MonthComparison | null>(null);

  // Initialize with the two most recent months
  useEffect(() => {
    if (snapshots.length >= 2 && !month1Id && !month2Id) {
      setMonth1Id(snapshots[1].id); // Second most recent (earlier)
      setMonth2Id(snapshots[0].id); // Most recent (later)
    }
  }, [snapshots, month1Id, month2Id]);

  // Update comparison when months change
  useEffect(() => {
    if (month1Id && month2Id && month1Id !== month2Id) {
      const result = getComparison(month1Id, month2Id);
      setComparison(result);
    } else {
      setComparison(null);
    }
  }, [month1Id, month2Id, getComparison]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Compare Months
          </DialogTitle>
        </DialogHeader>

        {/* Month Selectors */}
        <div className="flex items-center gap-3 mb-6">
          <Select value={month1Id} onValueChange={setMonth1Id}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select first month" />
            </SelectTrigger>
            <SelectContent>
              {snapshots.map((snapshot) => (
                <SelectItem 
                  key={snapshot.id} 
                  value={snapshot.id}
                  disabled={snapshot.id === month2Id}
                >
                  {formatMonth(snapshot.snapshot_month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

          <Select value={month2Id} onValueChange={setMonth2Id}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select second month" />
            </SelectTrigger>
            <SelectContent>
              {snapshots.map((snapshot) => (
                <SelectItem 
                  key={snapshot.id} 
                  value={snapshot.id}
                  disabled={snapshot.id === month1Id}
                >
                  {formatMonth(snapshot.snapshot_month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {comparison ? (
          <div className="space-y-6">
            {/* Header Row */}
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">Metric</span>
              <span className="text-sm font-medium text-muted-foreground text-right">
                {formatMonth(comparison.month1.snapshot_month).split(' ')[0]}
              </span>
              <span className="text-sm font-medium text-muted-foreground text-right">
                {formatMonth(comparison.month2.snapshot_month).split(' ')[0]}
              </span>
              <span className="text-sm font-medium text-muted-foreground text-right">Change</span>
            </div>

            {/* Main Metrics */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Overview</h3>
              <ChangeRow
                label="Net Worth"
                value1={comparison.month1.net_worth}
                value2={comparison.month2.net_worth}
                change={comparison.changes.netWorth}
                formatValue={formatValue}
              />
              <ChangeRow
                label="Total Assets"
                value1={comparison.month1.total_assets}
                value2={comparison.month2.total_assets}
                change={comparison.changes.totalAssets}
                formatValue={formatValue}
              />
              <ChangeRow
                label="Total Debt"
                value1={comparison.month1.total_debt}
                value2={comparison.month2.total_debt}
                change={comparison.changes.totalDebt}
                formatValue={formatValue}
              />
              <ChangeRow
                label="Monthly Income"
                value1={comparison.month1.total_income}
                value2={comparison.month2.total_income}
                change={comparison.changes.totalIncome}
                formatValue={formatValue}
              />
              <ChangeRow
                label="Monthly Expenses"
                value1={comparison.month1.total_expenses}
                value2={comparison.month2.total_expenses}
                change={comparison.changes.totalExpenses}
                formatValue={formatValue}
              />
            </div>

            {/* Asset Breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Asset Breakdown</h3>
              <ChangeRow
                label="Banking"
                value1={comparison.month1.assets_breakdown.banking}
                value2={comparison.month2.assets_breakdown.banking}
                change={comparison.changes.breakdown.banking}
                formatValue={formatValue}
              />
              <ChangeRow
                label="Crypto"
                value1={comparison.month1.assets_breakdown.crypto}
                value2={comparison.month2.assets_breakdown.crypto}
                change={comparison.changes.breakdown.crypto}
                formatValue={formatValue}
              />
              <ChangeRow
                label="Stocks"
                value1={comparison.month1.assets_breakdown.stocks}
                value2={comparison.month2.assets_breakdown.stocks}
                change={comparison.changes.breakdown.stocks}
                formatValue={formatValue}
              />
              <ChangeRow
                label="Commodities"
                value1={comparison.month1.assets_breakdown.commodities}
                value2={comparison.month2.assets_breakdown.commodities}
                change={comparison.changes.breakdown.commodities}
                formatValue={formatValue}
              />
            </div>

            {/* Summary */}
            <div className={cn(
              "p-4 rounded-lg",
              comparison.changes.netWorth.absolute >= 0 ? "bg-success/10" : "bg-danger/10"
            )}>
              <div className="flex items-center gap-2 mb-1">
                {comparison.changes.netWorth.absolute >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-danger" />
                )}
                <span className="font-medium">
                  Net Worth {comparison.changes.netWorth.absolute >= 0 ? 'increased' : 'decreased'} by{' '}
                  {formatValue(Math.abs(comparison.changes.netWorth.absolute), false)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                From {formatMonth(comparison.month1.snapshot_month)} to {formatMonth(comparison.month2.snapshot_month)}
                {' '}({comparison.changes.netWorth.absolute >= 0 ? '+' : ''}{comparison.changes.netWorth.percent.toFixed(2)}%)
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select two different months to compare</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
