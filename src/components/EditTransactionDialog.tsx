import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssetTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';

const editTransactionSchema = z.object({
  quantity: z.number().positive('Quantity must be greater than 0'),
  price_per_unit: z.number().min(0, 'Price must be 0 or greater'),
  transaction_date: z.string().min(1, 'Date is required'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  realized_pnl: z.number().optional(),
});

type EditTransactionFormData = z.infer<typeof editTransactionSchema>;

interface EditTransactionDialogProps {
  transaction: AssetTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: EditTransactionFormData) => Promise<void>;
  formatValue: (value: number) => string;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onSave,
  formatValue,
}: EditTransactionDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTransactionFormData>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      quantity: transaction?.quantity || 0,
      price_per_unit: transaction?.price_per_unit || 0,
      transaction_date: transaction?.transaction_date || new Date().toISOString().split('T')[0],
      notes: transaction?.notes || '',
      realized_pnl: transaction?.realized_pnl,
    },
  });

  const quantity = watch('quantity');
  const pricePerUnit = watch('price_per_unit');
  const transactionDate = watch('transaction_date');
  const totalValue = (quantity || 0) * (pricePerUnit || 0);

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      reset({
        quantity: transaction.quantity,
        price_per_unit: transaction.price_per_unit,
        transaction_date: transaction.transaction_date,
        notes: transaction.notes || '',
        realized_pnl: transaction.realized_pnl,
      });
    }
  }, [transaction, reset]);

  const onSubmit = async (data: EditTransactionFormData) => {
    if (!transaction) return;
    
    await onSave(transaction.id, {
      ...data,
      total_value: data.quantity * data.price_per_unit,
    } as any);
    
    onOpenChange(false);
  };

  if (!transaction) return null;

  const isSellTransaction = transaction.transaction_type === 'sell';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Edit Transaction
            <Badge 
              variant={isSellTransaction ? 'destructive' : 'default'}
              className="text-xs"
            >
              {transaction.transaction_type.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-2">
              {/* Asset Info (read-only) */}
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium">{transaction.asset_name}</p>
                <p className="text-xs text-muted-foreground">{transaction.symbol} • {transaction.category}</p>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  {...register('quantity', { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
              </div>

              {/* Price per unit */}
              <div className="space-y-2">
                <Label htmlFor="price_per_unit">Price per Unit</Label>
                <Input
                  id="price_per_unit"
                  type="number"
                  step="any"
                  {...register('price_per_unit', { valueAsNumber: true })}
                />
                {errors.price_per_unit && (
                  <p className="text-xs text-destructive">{errors.price_per_unit.message}</p>
                )}
              </div>

              {/* Total Value (computed) */}
              <div className="p-3 bg-secondary/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-lg font-semibold">{formatValue(totalValue)}</p>
              </div>

              {/* Transaction Date */}
              <div className="space-y-2">
                <Label>Transaction Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !transactionDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate 
                        ? format(new Date(transactionDate), 'PPP')
                        : 'Pick a date'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transactionDate ? new Date(transactionDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setValue('transaction_date', date.toISOString().split('T')[0]);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.transaction_date && (
                  <p className="text-xs text-destructive">{errors.transaction_date.message}</p>
                )}
              </div>

              {/* Realized P&L (only for sell transactions) */}
              {isSellTransaction && (
                <div className="space-y-2">
                  <Label htmlFor="realized_pnl">Realized P&L</Label>
                  <Input
                    id="realized_pnl"
                    type="number"
                    step="any"
                    {...register('realized_pnl', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Profit or loss from this sale
                  </p>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this transaction..."
                  className="resize-none"
                  rows={3}
                  {...register('notes')}
                />
                {errors.notes && (
                  <p className="text-xs text-destructive">{errors.notes.message}</p>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
