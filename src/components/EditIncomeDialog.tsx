import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Income, DisplayUnit, BANKING_CURRENCIES, BITCOIN_CURRENCIES, isBitcoinCurrency } from '@/lib/types';

const incomeSchema = z.object({
  source: z.string().min(1, 'Source is required').max(100),
  amount: z.number().min(0.00000001, 'Amount must be positive'),
  type: z.enum(['work', 'passive', 'investment', 'mining'] as const),
  currency: z.string().min(1, 'Currency is required'),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface EditIncomeDialogProps {
  income: Income;
  onUpdate: (id: string, data: Partial<Omit<Income, 'id'>>) => void;
  displayUnit: DisplayUnit;
}

const incomeTypes = [
  { value: 'work', label: 'Work Income' },
  { value: 'passive', label: 'Passive Income' },
  { value: 'investment', label: 'Investment Income' },
  { value: 'mining', label: 'Bitcoin Mining' },
];

// Combine fiat and bitcoin currencies for the selector
const allCurrencies = [
  ...BITCOIN_CURRENCIES.map(c => ({ value: c.value, label: c.label, symbol: c.symbol })),
  ...BANKING_CURRENCIES.map(c => ({ value: c.value, label: c.label, symbol: c.symbol })),
];

export function EditIncomeDialog({ income, onUpdate, displayUnit }: EditIncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: income.source,
      amount: income.amount,
      type: income.type,
      currency: income.currency || 'USD',
    },
  });

  // Watch the currency field to react to changes
  const selectedType = useWatch({ control: form.control, name: 'type' });
  const selectedCurrency = useWatch({ control: form.control, name: 'currency' });

  const currencySymbol = allCurrencies.find(c => c.value === selectedCurrency)?.symbol || selectedCurrency;

  // Get appropriate step and placeholder based on currency
  const getInputStep = () => {
    if (selectedCurrency === 'BTC') return '0.00000001';
    if (selectedCurrency === 'SATS') return '1';
    return '0.01';
  };

  useEffect(() => {
    if (open) {
      form.reset({
        source: income.source,
        amount: income.amount,
        type: income.type,
        currency: income.currency || 'USD',
      });
    }
  }, [open, income, form]);

  const onSubmit = (data: IncomeFormData) => {
    onUpdate(income.id, data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-success/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-success">Edit Income Source</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Source</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={selectedType === 'mining' ? 'e.g., Bitcoin Mining Pool' : 'e.g., Salary, Rental Income'} 
                      {...field} 
                      className="bg-secondary/50" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {incomeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {selectedType === 'mining' && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Bitcoin</div>
                          {BITCOIN_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.symbol} - {currency.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Fiat Currencies</div>
                        </>
                      )}
                      {BANKING_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.symbol} - {currency.label}
                        </SelectItem>
                      ))}
                      {selectedType !== 'mining' && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Bitcoin</div>
                          {BITCOIN_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.symbol} - {currency.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Amount ({currencySymbol})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={getInputStep()}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-success hover:bg-success/90">
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
