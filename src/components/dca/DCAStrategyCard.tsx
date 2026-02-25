import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { EditDCADialog } from '@/components/dca/EditDCADialog';
import { Clock, Zap, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DCAStrategy, CreateDCAStrategyInput } from '@/hooks/useDCAStrategies';

interface DCAStrategyCardProps {
  strategy: DCAStrategy;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, input: Partial<CreateDCAStrategyInput>) => Promise<void>;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

export function DCAStrategyCard({ strategy, onToggle, onDelete, onUpdate }: DCAStrategyCardProps) {
  const dipEnabled = (strategy.dip_threshold_pct ?? 0) > 0;

  return (
    <Card className="glass-card group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{strategy.from_token} → {strategy.to_token}</span>
            <Badge 
              variant={strategy.is_active ? 'outline' : 'secondary'} 
              className={`text-xs ${strategy.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`}
            >
              {strategy.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <EditDCADialog strategy={strategy} onUpdate={onUpdate} />
            <Switch
              checked={strategy.is_active}
              onCheckedChange={(checked) => onToggle(strategy.id, checked)}
            />
            <DeleteConfirmDialog
              title="Delete DCA Strategy?"
              description={`This will permanently delete your ${strategy.from_token} → ${strategy.to_token} DCA strategy.`}
              onConfirm={() => onDelete(strategy.id)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="w-3.5 h-3.5" />
            <span>${strategy.amount_per_execution} per execution</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{FREQUENCY_LABELS[strategy.frequency] || strategy.frequency}</span>
          </div>
          {dipEnabled && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Dip buy at {strategy.dip_threshold_pct}% drop (×{strategy.dip_multiplier})</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div>
            <span className="block font-medium text-foreground">{strategy.executions_completed}</span>
            Executions
          </div>
          <div>
            <span className="block font-medium text-foreground">${Number(strategy.total_spent_usd).toFixed(2)}</span>
            Total Spent
          </div>
          <div>
            <span className="block font-medium text-foreground">{Number(strategy.tokens_accumulated).toFixed(6)}</span>
            Accumulated
          </div>
        </div>

        {strategy.last_executed_at && (
          <p className="text-xs text-muted-foreground mt-2">
            Last run {formatDistanceToNow(new Date(strategy.last_executed_at), { addSuffix: true })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
