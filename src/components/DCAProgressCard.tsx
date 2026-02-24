import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Pencil, Play, Trash2 } from 'lucide-react';
import type { DCAStrategy } from '@/hooks/useDCAStrategies';

interface DCAProgressCardProps {
  strategy: DCAStrategy;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (strategy: DCAStrategy) => void;
}

export function DCAProgressCard({ strategy, onToggle, onDelete, onEdit }: DCAProgressCardProps) {
  const budgetProgress = strategy.total_budget_usd
    ? Math.min(100, (strategy.total_spent_usd / strategy.total_budget_usd) * 100)
    : null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const nextExecLabel = (() => {
    if (!strategy.is_active) return 'Paused';
    if (strategy.next_execution_at) {
      const next = new Date(strategy.next_execution_at);
      return next > new Date() ? fmt(strategy.next_execution_at) : 'Due now';
    }
    const baseDate = strategy.last_executed_at || strategy.created_at;
    const base = new Date(baseDate);
    const freqHours: Record<string, number> = { hourly: 1, daily: 24, weekly: 168, biweekly: 336, monthly: 720 };
    const nextDate = new Date(base.getTime() + (freqHours[strategy.frequency] || 24) * 3600_000);
    return nextDate > new Date() ? fmt(nextDate.toISOString()) : 'Due now';
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          {strategy.from_token} → {strategy.to_token}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
            {strategy.is_active ? 'Active' : 'Paused'}
          </Badge>
          <Button size="icon" variant="ghost" onClick={() => onEdit(strategy)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onToggle(strategy.id, !strategy.is_active)}>
            {strategy.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(strategy.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">${strategy.amount_per_execution}/exec</p>
          </div>
          <div>
            <p className="text-muted-foreground">Frequency</p>
            <p className="font-medium capitalize">{strategy.frequency}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Executions</p>
            <p className="font-medium">
              {strategy.executions_completed}
              {strategy.max_executions ? ` / ${strategy.max_executions}` : ''}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{fmt(strategy.created_at)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Next Run</p>
            <p className="font-medium">{nextExecLabel}</p>
          </div>
        </div>

        {budgetProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Budget used</span>
              <span>${strategy.total_spent_usd.toFixed(2)} / ${strategy.total_budget_usd?.toFixed(2)}</span>
            </div>
            <Progress value={budgetProgress} className="h-2" />
          </div>
        )}

        {strategy.total_spent_usd > 0 && (
          <div className="text-xs text-muted-foreground">
            Total spent: ${strategy.total_spent_usd.toFixed(2)}
          </div>
        )}

        {strategy.dip_threshold_pct > 0 && (
          <div className="text-xs text-muted-foreground">
            Dip buy: {strategy.dip_multiplier}× when price drops &gt;{strategy.dip_threshold_pct}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
