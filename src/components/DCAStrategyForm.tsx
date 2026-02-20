import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TrendingUp } from 'lucide-react';
import type { CreateStrategyInput } from '@/hooks/useDCAStrategies';

interface DCAStrategyFormProps {
  onSubmit: (input: CreateStrategyInput) => Promise<void>;
  isSubmitting?: boolean;
}

const TOKEN_OPTIONS = [
  { value: 'WETH', label: 'WETH (Wrapped Ether)' },
  { value: 'ETH', label: 'ETH (Ether)' },
  { value: 'cbBTC', label: 'cbBTC (Coinbase BTC)' },
];

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function DCAStrategyForm({ onSubmit, isSubmitting }: DCAStrategyFormProps) {
  const [toToken, setToToken] = useState('WETH');
  const [frequency, setFrequency] = useState('daily');
  const [amount, setAmount] = useState('10');
  const [budget, setBudget] = useState('');
  const [maxExecutions, setMaxExecutions] = useState('');
  const [enableDip, setEnableDip] = useState(false);
  const [dipThreshold, setDipThreshold] = useState('5');
  const [dipMultiplier, setDipMultiplier] = useState('2');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      to_token: toToken,
      frequency,
      amount_per_execution: parseFloat(amount),
      total_budget_usd: budget ? parseFloat(budget) : null,
      max_executions: maxExecutions ? parseInt(maxExecutions) : null,
      dip_threshold_pct: enableDip ? parseFloat(dipThreshold) : 0,
      dip_multiplier: enableDip ? parseFloat(dipMultiplier) : 1,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          New DCA Strategy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buy Token</Label>
              <Select value={toToken} onValueChange={setToToken}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOKEN_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Strategy'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
