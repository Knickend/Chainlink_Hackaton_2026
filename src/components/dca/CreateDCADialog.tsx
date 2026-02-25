import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { CreateDCAStrategyInput } from '@/hooks/useDCAStrategies';

interface CreateDCADialogProps {
  onCreate: (input: CreateDCAStrategyInput) => Promise<void>;
}

export function CreateDCADialog({ onCreate }: CreateDCADialogProps) {
  const [open, setOpen] = useState(false);
  const [toToken, setToToken] = useState('WETH');
  const [amount, setAmount] = useState('10');
  const [frequency, setFrequency] = useState('daily');
  const [dipThreshold, setDipThreshold] = useState('');
  const [dipMultiplier, setDipMultiplier] = useState('2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onCreate({
        to_token: toToken,
        amount_per_execution: parseFloat(amount),
        frequency,
        dip_threshold_pct: dipThreshold ? parseFloat(dipThreshold) : undefined,
        dip_multiplier: dipThreshold ? parseFloat(dipMultiplier) : undefined,
      });
      setOpen(false);
      setAmount('10');
      setDipThreshold('');
    } catch {
      // toast handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Strategy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create DCA Strategy</DialogTitle>
          <DialogDescription>Set up automated dollar-cost averaging from USDC into your chosen token.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Target Token</Label>
            <Select value={toToken} onValueChange={setToToken}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WETH">WETH (Wrapped ETH)</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="cbBTC">cbBTC (Coinbase BTC)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount per Execution (USDC)</Label>
            <Input type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dip Threshold % (optional)</Label>
            <Input type="number" min="0" step="1" placeholder="e.g. 5 for 5% dip" value={dipThreshold} onChange={e => setDipThreshold(e.target.value)} />
            <p className="text-xs text-muted-foreground">Buy extra when price drops this % from last execution price.</p>
          </div>

          {dipThreshold && parseFloat(dipThreshold) > 0 && (
            <div className="space-y-2">
              <Label>Dip Multiplier</Label>
              <Input type="number" min="1" step="0.5" value={dipMultiplier} onChange={e => setDipMultiplier(e.target.value)} />
              <p className="text-xs text-muted-foreground">Multiply the buy amount by this factor during a dip.</p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting || !amount || parseFloat(amount) <= 0} className="w-full">
            {isSubmitting ? 'Creating...' : 'Create Strategy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
