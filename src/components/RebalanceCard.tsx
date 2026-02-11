import { motion } from 'framer-motion';
import { Scale, X, ArrowUpRight, ArrowDownRight, CheckCircle2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DriftItem, TradeSuggestion, RebalanceAlert } from '@/hooks/useRebalancer';

interface RebalanceCardProps {
  driftData: DriftItem[];
  tradeSuggestions: TradeSuggestion[];
  maxDrift: number;
  threshold: number;
  alerts: RebalanceAlert[];
  onDismiss: (alertId?: string) => void;
  formatValue: (value: number) => string;
  onEdit?: () => void;
}

function getDriftColor(diff: number, threshold: number): string {
  const abs = Math.abs(diff);
  if (abs <= threshold * 0.5) return 'text-green-500';
  if (abs <= threshold) return 'text-amber-500';
  return 'text-destructive';
}

function getDriftBg(diff: number, threshold: number): string {
  const abs = Math.abs(diff);
  if (abs <= threshold * 0.5) return 'bg-green-500/10';
  if (abs <= threshold) return 'bg-amber-500/10';
  return 'bg-destructive/10';
}

export function RebalanceCard({
  driftData,
  tradeSuggestions,
  maxDrift,
  threshold,
  alerts,
  onDismiss,
  formatValue,
  onEdit,
}: RebalanceCardProps) {
  if (driftData.length === 0) return null;

  const hasActiveAlert = alerts.length > 0;
  const isOverThreshold = driftData.some((d) => Math.abs(d.diff) > threshold);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-6 border-l-4"
      style={{
        borderLeftColor: isOverThreshold
          ? 'hsl(var(--destructive))'
          : 'hsl(var(--primary))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Portfolio Rebalancer</h3>
          {isOverThreshold && (
            <Badge variant="destructive" className="text-xs">
              {Math.round(maxDrift)}% drift
            </Badge>
          )}
          {!isOverThreshold && (
            <Badge variant="secondary" className="text-xs gap-1">
              <CheckCircle2 className="w-3 h-3" />
              On track
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              title="Edit rebalance settings"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          )}
          {hasActiveAlert && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDismiss(alerts[0]?.id)}
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Drift bars */}
      <div className="space-y-3 mb-4">
        {driftData.map((item) => (
          <div key={item.category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.category}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  Target: {item.target}%
                </span>
                <span className="text-xs font-medium">
                  Actual: {item.actual}%
                </span>
                <span
                  className={`text-xs font-semibold ${getDriftColor(item.diff, threshold)}`}
                >
                  {item.diff > 0 ? '+' : ''}
                  {item.diff}%
                </span>
              </div>
            </div>
            {/* Dual bar: target vs actual */}
            <div className="flex gap-1 h-3">
              <div className="flex-1 relative bg-muted rounded-full overflow-hidden">
                {/* Target bar (faded) */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-30"
                  style={{
                    width: `${Math.min(item.target, 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
                {/* Actual bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.min(item.actual, 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
            {/* Drift indicator */}
            {Math.abs(item.diff) > threshold && (
              <div
                className={`text-xs px-2 py-1 rounded ${getDriftBg(item.diff, threshold)} ${getDriftColor(item.diff, threshold)}`}
              >
                {item.diff > 0 ? 'Overweight' : 'Underweight'} by{' '}
                {Math.abs(item.diff).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Trade suggestions */}
      {tradeSuggestions.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Suggested Trades
          </h4>
          {tradeSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm"
            >
              {suggestion.action === 'sell' ? (
                <ArrowDownRight className="w-4 h-4 text-destructive flex-shrink-0" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              <span>
                Consider {suggestion.action === 'sell' ? 'selling' : 'buying'}{' '}
                ~{formatValue(suggestion.amount)} of{' '}
                <span className="font-medium">{suggestion.category}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
