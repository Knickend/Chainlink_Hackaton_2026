import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import type { DCAStrategy, CreateStrategyInput } from '@/hooks/useDCAStrategies';

interface EditDCADialogProps {
  strategy: DCAStrategy;
  onUpdate: (id: string, input: Partial<CreateStrategyInput>) => Promise<void>;
}

export function EditDCADialog({ strategy, onUpdate }: EditDCADialogProps) {
  const [open, setOpen] = useState(false);
  const [toToken, setToToken] = useState(strategy.to_token);
  const [amount, setAmount] = useState(String(strategy.amount_per_execution));
  const [frequency, setFrequency] = useState(strategy.frequency);
  const [dipThreshold, setDipThreshold] = useState(strategy.dip_threshold_pct ? String(strategy.dip_threshold_pct) : '');
  const [dipMultiplier, setDipMultiplier] = useState(strategy.dip_multiplier ? String(strategy.dip_multiplier) : '2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate(strategy.id, {
        to_token: toToken,
        amount_per_execution: parseFloat(amount),
        frequency,
        dip_threshold_pct: dipThreshold ? parseFloat(dipThreshold) : 0,
        dip_multiplier: dipThreshold ? parseFloat(dipMultiplier) : 1,
      });
      setOpen(false);
    } catch {
      // toast handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit DCA Strategy</DialogTitle>
          <DialogDescription>Update your DCA strategy parameters.</DialogDescription>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
