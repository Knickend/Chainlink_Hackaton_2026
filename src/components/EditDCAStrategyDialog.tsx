import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { DCAStrategy, CreateStrategyInput } from '@/hooks/useDCAStrategies';

interface EditDCAStrategyDialogProps {
  strategy: DCAStrategy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, input: Partial<CreateStrategyInput>) => Promise<void>;
}

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function EditDCAStrategyDialog({ strategy, open, onOpenChange, onSave }: EditDCAStrategyDialogProps) {
  const [frequency, setFrequency] = useState(strategy.frequency);
  const [amount, setAmount] = useState(String(strategy.amount_per_execution));
  const [budget, setBudget] = useState(strategy.total_budget_usd ? String(strategy.total_budget_usd) : '');
  const [maxExecutions, setMaxExecutions] = useState(strategy.max_executions ? String(strategy.max_executions) : '');
  const [enableDip, setEnableDip] = useState(strategy.dip_threshold_pct > 0);
  const [dipThreshold, setDipThreshold] = useState(String(strategy.dip_threshold_pct || 5));
  const [dipMultiplier, setDipMultiplier] = useState(String(strategy.dip_multiplier || 2));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(strategy.id, {
        frequency,
        amount_per_execution: parseFloat(amount),
        total_budget_usd: budget ? parseFloat(budget) : null,
        max_executions: maxExecutions ? parseInt(maxExecutions) : null,
        dip_threshold_pct: enableDip ? parseFloat(dipThreshold) : 0,
        dip_multiplier: enableDip ? parseFloat(dipMultiplier) : 1,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Strategy: {strategy.from_token} → {strategy.to_token}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount per execution (USDC)</Label>
            <Input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Budget (optional)</Label>
              <Input type="number" min="0" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="No limit" />
            </div>
            <div className="space-y-2">
              <Label>Max Executions (optional)</Label>
              <Input type="number" min="0" step="1" value={maxExecutions} onChange={e => setMaxExecutions(e.target.value)} placeholder="No limit" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">Dip Buying</p>
              <p className="text-xs text-muted-foreground">Buy more when the price drops</p>
            </div>
            <Switch checked={enableDip} onCheckedChange={setEnableDip} />
          </div>

          {enableDip && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dip Threshold (%)</Label>
                <Input type="number" min="1" max="50" step="0.5" value={dipThreshold} onChange={e => setDipThreshold(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dip Multiplier</Label>
                <Input type="number" min="1" max="10" step="0.5" value={dipMultiplier} onChange={e => setDipMultiplier(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
