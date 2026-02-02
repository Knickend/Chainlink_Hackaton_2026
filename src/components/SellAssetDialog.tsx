import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

const sellSchema = z.object({
  quantity: z.number().min(0.000001, 'Quantity is required'),
  price_per_unit: z.number().min(0, 'Price must be positive'),
  transaction_date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type SellFormData = z.infer<typeof sellSchema>;

interface SellAssetDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSell: (assetId: string, data: {
    quantity: number;
    price_per_unit: number;
    total_value: number;
    realized_pnl?: number;
    transaction_date: string;
    notes?: string;
  }) => Promise<void>;
  currentPrice?: number;
}

export function SellAssetDialog({
  asset,
  open,
  onOpenChange,
  onSell,
  currentPrice,
}: SellAssetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<SellFormData>({
    resolver: zodResolver(sellSchema),
    defaultValues: {
      quantity: 0,
      price_per_unit: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const quantity = form.watch('quantity');
  const pricePerUnit = form.watch('price_per_unit');

  // Calculate totals
  const totalValue = quantity * pricePerUnit;
  const costBasisPerUnit = asset?.purchase_price_per_unit || 
    (asset?.cost_basis && asset?.quantity ? asset.cost_basis / asset.quantity : 0);
  const costOfSoldUnits = quantity * costBasisPerUnit;
  const realizedPnL = costBasisPerUnit > 0 ? totalValue - costOfSoldUnits : undefined;
  const realizedPnLPercent = costOfSoldUnits > 0 && realizedPnL !== undefined 
    ? (realizedPnL / costOfSoldUnits) * 100 
    : undefined;

  // Reset form when asset changes
  useEffect(() => {
    if (open && asset) {
      form.reset({
        quantity: asset.quantity || 0,
        price_per_unit: currentPrice || 0,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [open, asset, currentPrice, form]);

  const onSubmit = async (data: SellFormData) => {
    if (!asset) return;
    
    setIsSubmitting(true);
    try {
      await onSell(asset.id, {
        quantity: data.quantity,
        price_per_unit: data.price_per_unit,
        total_value: data.quantity * data.price_per_unit,
        realized_pnl: realizedPnL,
        transaction_date: data.transaction_date,
        notes: data.notes,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!asset) return null;

  const maxQuantity = asset.quantity || 0;
  const isFullSale = quantity >= maxQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Sell {asset.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity to Sell
                    <span className="text-muted-foreground ml-2">
                      (max: {maxQuantity.toLocaleString()})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.000001"
                      max={maxQuantity}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price_per_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Price per Unit (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  {currentPrice && (
                    <p className="text-xs text-muted-foreground">
                      Current market price: ${currentPrice.toLocaleString()}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* P&L Preview */}
            <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sale Proceeds</span>
                <span className="font-mono">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              
              {costBasisPerUnit > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost Basis</span>
                    <span className="font-mono">${costOfSoldUnits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Realized P&L
                      {realizedPnL !== undefined && (
                        realizedPnL >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        )
                      )}
                    </span>
                    <span className={cn(
                      'font-mono font-semibold',
                      realizedPnL !== undefined && realizedPnL >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {realizedPnL !== undefined ? (
                        <>
                          {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <span className="text-xs ml-1">
                            ({realizedPnLPercent !== undefined ? (realizedPnLPercent >= 0 ? '+' : '') + realizedPnLPercent.toFixed(1) : 0}%)
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">No cost basis</span>
                      )}
                    </span>
                  </div>
                </>
              )}

              {!costBasisPerUnit && (
                <p className="text-xs text-warning">
                  No cost basis set. P&L cannot be calculated.
                </p>
              )}
            </div>

            {isFullSale && (
              <p className="text-sm text-warning">
                This will fully close your position and remove the asset.
              </p>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this sale..."
                      {...field}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>

            <div className="flex justify-end gap-2 pt-4 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || quantity <= 0}
                variant="destructive"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Sale'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
